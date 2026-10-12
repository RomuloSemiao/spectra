:- encoding(utf8).

/*  Deteção de espécies químicas.

    Entrada: medidas por banda vindas do extrator numérico, m(Banda, Coberta, Sigma),
    e o contexto do alvo (por agora, o raio da estrela).

    Estados, do mais forte para o mais fraco:
        detetada | tentativa | indicio | nao_detetada | sem_cobertura

    O motor faz três passagens:
      1. estado base de cada espécie a partir dos σ das suas bandas;
      2. ajuste pelo contexto: em anãs M, sinal só abaixo de 3 µm baixa um nível
         (manchas e fáculas imitam bandas de água e alcalinos);
      3. alertas que dependem do conjunto: bandas muito abaixo do contínuo e sinais
         que outra espécie já detetada pode explicar.
    Para cada espécie devolve também o que faltaria para subir de nível.

    Estas conclusões NÃO são gravadas na base: recalculam-se sempre.
*/
:- module(detecao, [avaliar_todas/3, comparar/5, limiar/2, regra/2]).

:- use_module('../kb').

% ------------------------------------------------------------ conhecimento

limiar(forte,   5.0).   % detetada
limiar(fraca,   3.0).   % tentativa
limiar(indicio, 2.0).   % indício
limiar(anomalia, -3.0). % banda muito abaixo do contínuo

%   Bandas fracas: cobri-las não chega para avaliar a espécie face à literatura.
banda_fraca(co2_20).

%   Estrelas pequenas (anãs M): contaminação por manchas e fáculas não ocultadas.
raio_ana_m(0.6).
limite_contaminacao_um(3.0).

nome_estado(detetada,      'detetada').
nome_estado(tentativa,     'tentativa').
nome_estado(indicio,       'indício').
nome_estado(nao_detetada,  'não detetada').
nome_estado(sem_cobertura, 'fora do espectro').

rebaixar(detetada,  tentativa).
rebaixar(tentativa, indicio).

% ------------------------------------------------------------ utilitários

sigma(Ms, B, S) :- memberchk(m(B, true, S), Ms), number(S).
coberta(Ms, B)  :- memberchk(m(B, true, _), Ms).
bandas_de(E, Bs) :- findall(B, banda(E, B, _, _), Bs).
acima(Ms, Min, Bs, Sel) :- include([B]>>(sigma(Ms, B, S), S >= Min), Bs, Sel).

faixa(B, F) :- banda(_, B, L0, L1), format(atom(F), '~w–~w µm', [L0, L1]).

descrever(Ms, Bs, Txt) :-
    findall(T, ( member(B, Bs), sigma(Ms, B, S), faixa(B, F),
                 format(atom(T), '~w (~1fσ)', [F, S]) ), Ts),
    atomic_list_concat(Ts, ', ', Txt).

max_sigma(Ms, E, S, B) :-
    bandas_de(E, Bs),
    findall(S0-B0, ( member(B0, Bs), sigma(Ms, B0, S0) ), Ps),
    Ps \== [], max_member(S-B, Ps).

nomes(Es, Txt) :-
    findall(N, ( member(E, Es), especie(E, N) ), Ns0), sort(Ns0, Ns),
    atomic_list_concat(Ns, ', ', Txt).

%   Espécies (≠ E) com bandas que se sobrepõem a [A0, A1]
sobrepostas(E, A0, A1, Es) :-
    findall(E2, ( banda(E2, _, C0, C1), E2 \== E, A0 < C1, C0 < A1 ), L),
    sort(L, Es).

nota_sobreposicao(E, Bs, Nota) :-
    findall(E2, ( member(B, Bs), banda(E, B, A0, A1), sobrepostas(E, A0, A1, L), member(E2, L) ), L0),
    sort(L0, L),
    (   L == []
    ->  Nota = ''
    ;   nomes(L, T),
        format(atom(Nota), ' A banda com sinal sobrepõe-se a ~w: o excesso sozinho não distingue estas espécies.', [T])
    ).

% ------------------------------------------------------------ 1. estado base

estado(Ms, E, detetada, Motivo) :-
    limiar(forte, F), limiar(fraca, W),
    bandas_de(E, Bs),
    acima(Ms, F, Bs, [_|_]),
    include(coberta(Ms), Bs, Cob), length(Cob, NC),
    acima(Ms, W, Bs, Sup), length(Sup, NS),
    ( NC =:= 1 ; NS >= 2 ),
    descrever(Ms, Sup, Txt),
    (   NC =:= 1
    ->  format(atom(M0), 'Excesso forte em ~w; é a única banda coberta.', [Txt])
    ;   format(atom(M0), 'Excesso em ~w: sinal corroborado em mais de uma banda.', [Txt])
    ),
    nota_sobreposicao(E, Sup, Nota),
    atom_concat(M0, Nota, Motivo).
estado(Ms, E, tentativa, Motivo) :-
    limiar(fraca, W),
    bandas_de(E, Bs),
    acima(Ms, W, Bs, Sup), Sup \== [],
    descrever(Ms, Sup, Txt),
    include(coberta(Ms), Bs, Cob),
    subtract(Cob, Sup, SemSinal),
    (   SemSinal == []
    ->  format(atom(M0), 'Excesso moderado (entre 3σ e 5σ) em ~w.', [Txt])
    ;   findall(F, (member(B, SemSinal), faixa(B, F)), Fs),
        atomic_list_concat(Fs, ', ', SS),
        ( Fs = [_] -> Frase = 'que também está coberta' ; Frase = 'que também estão cobertas' ),
        format(atom(M0), 'Sinal ≥ 3σ em ~w, mas não em ~w, ~w.', [Txt, SS, Frase])
    ),
    nota_sobreposicao(E, Sup, Nota),
    atom_concat(M0, Nota, Motivo).
estado(Ms, E, indicio, Motivo) :-
    limiar(indicio, I),
    bandas_de(E, Bs),
    acima(Ms, I, Bs, Ind), Ind \== [],
    descrever(Ms, Ind, Txt),
    format(atom(M0), 'Excesso em ~w: na direção de uma absorção, mas abaixo de 3σ.', [Txt]),
    nota_sobreposicao(E, Ind, Nota),
    atom_concat(M0, Nota, Motivo).
estado(Ms, E, sem_cobertura, 'Nenhuma banda desta espécie tem pontos suficientes neste espectro.') :-
    bandas_de(E, Bs),
    \+ ( member(B, Bs), coberta(Ms, B) ).
estado(Ms, E, nao_detetada, Motivo) :-
    (   max_sigma(Ms, E, S0, B)
    ->  faixa(B, F),
        ( abs(S0) < 0.05 -> S = 0.0 ; S = S0 ),
        format(atom(Motivo), 'Maior excesso: ~1fσ em ~w, abaixo do nível de indício (2σ).', [S, F])
    ;   Motivo = 'As bandas cobertas não têm medida de excesso.'
    ).

% ------------------------------------------------------------ 2. contexto

%   Em anãs M, um sinal que só existe abaixo de 3 µm pode vir da estrela.
contaminacao_estelar(Ms, Rs, E, E0) :-
    number(Rs), raio_ana_m(Rmax), Rs < Rmax,
    memberchk(E0, [detetada, tentativa]),
    limiar(fraca, W), limite_contaminacao_um(Lc),
    bandas_de(E, Bs), acima(Ms, W, Bs, Sup), Sup \== [],
    forall(member(B, Sup), ( banda(_, B, _, L1), L1 =< Lc )).

avaliar(Ms, Rs, E, Estado, Motivo, Falta) :-
    estado(Ms, E, E0, M0), !,
    (   contaminacao_estelar(Ms, Rs, E, E0)
    ->  rebaixar(E0, Estado),
        nome_estado(E0, T0), nome_estado(Estado, T1),
        format(atom(Nota), ' Estrela anã M (R★ = ~2f R☉): abaixo de 3 µm, manchas e fáculas não ocultadas podem imitar estas bandas, por isso o nível baixa de ~w para ~w.', [Rs, T0, T1]),
        atom_concat(M0, Nota, Motivo),
        Contaminada = true
    ;   Estado = E0, Motivo = M0, Contaminada = false
    ),
    falta(Ms, E, Estado, Contaminada, Falta).

% ------------------------------------------------------------ o que faltaria

falta(_, _, detetada, _, '') :- !.
falta(_, _, _, true, 'Para subir de nível: sinal acima de 3 µm, onde a contaminação estelar pesa menos.') :- !.
falta(Ms, E, tentativa, _, F) :- !,
    limiar(forte, Fo),
    (   bandas_de(E, Bs), acima(Ms, Fo, Bs, [_|_])
    ->  F = 'Para detetada: outra banda coberta com pelo menos 3σ.'
    ;   max_sigma(Ms, E, S, _),
        format(atom(F), 'Para detetada: uma banda com pelo menos 5σ (o máximo atual é ~1fσ).', [S])
    ).
falta(Ms, E, indicio, _, F) :- !,
    max_sigma(Ms, E, S, _),
    format(atom(F), 'Para tentativa: uma banda com pelo menos 3σ (o máximo atual é ~1fσ).', [S]).
falta(_, _, nao_detetada, _, 'Para indício: uma banda com pelo menos 2σ.') :- !.
falta(_, E, sem_cobertura, _, F) :-
    findall(Fx, ( banda(E, B, _, _), \+ banda_fraca(B), faixa(B, Fx) ), Fs),
    atomic_list_concat(Fs, ', ', T),
    format(atom(F), 'Para avaliar: dados em ~w.', [T]).

% ------------------------------------------------------------ 3. alertas

%   Banda muito abaixo do contínuo: o contínuo provavelmente está elevado
%   por absorção de outra espécie nos flancos, ou há um sistemático.
alerta(Ms, E, _, _, A) :-
    limiar(anomalia, Lim),
    banda(E, B, L0, L1), sigma(Ms, B, S), S =< Lim,
    W is L1 - L0, F0 is L0 - W, F1 is L1 + W,
    findall(E2, ( banda(E2, _, C0, C1), E2 \== E,
                  ( (F0 < C1, C0 < L0) ; (L1 < C1, C0 < F1) ) ), L),
    sort(L, Es), faixa(B, Fx), Sa is abs(S),
    (   Es == []
    ->  format(atom(A), 'A banda ~w está ~1fσ abaixo do contínuo, o oposto de uma absorção: provável sistemático (por exemplo, desvio entre detetores).', [Fx, Sa])
    ;   nomes(Es, T),
        format(atom(A), 'A banda ~w está ~1fσ abaixo do contínuo: os flancos caem em bandas de ~w, cuja absorção pode elevar o contínuo.', [Fx, Sa, T])
    ).
%   Sinal em bandas partilhadas com uma espécie já detetada noutras bandas.
alerta(Ms, E, Estado, Detetadas, A) :-
    memberchk(Estado, [detetada, tentativa, indicio]),
    limiar(indicio, I), bandas_de(E, Bs), acima(Ms, I, Bs, Sinal), Sinal \== [],
    findall(E2, ( member(E2, Detetadas), E2 \== E ), Cands),
    member(E2, Cands),
    forall(member(B, Sinal), ( banda(E, B, A0, A1), banda(E2, _, C0, C1), A0 < C1, C0 < A1 )),
    especie(E2, N2),
    format(atom(A), 'Todo o sinal está em bandas partilhadas com ~w, detetada; ~w pode explicar este excesso.', [N2, N2]).

%!  avaliar_todas(+Medidas, +RaioEstrela, -Resultados) is det.
%   Resultados: lista de r(Especie, Estado, Motivo, Falta, Alertas).
avaliar_todas(Ms, Rs, Res) :-
    findall(E-r(Est, Mot, Fal), ( especie(E, _), avaliar(Ms, Rs, E, Est, Mot, Fal) ), Base),
    findall(E, member(E-r(detetada, _, _), Base), Detetadas),
    findall(r(E, Est, Mot, Fal, Als),
            ( member(E-r(Est, Mot, Fal), Base),
              findall(A, alerta(Ms, E, Est, Detetadas, A), Als0), sort(Als0, Als) ),
            Res).

% ------------------------------------------------------------ regras (texto)

regra(detetada,      'Pelo menos uma banda ≥ 5σ, corroborada por outra banda ≥ 3σ quando há mais de uma banda coberta.').
regra(tentativa,     'Pelo menos uma banda ≥ 3σ, sem cumprir o critério de deteção.').
regra(indicio,       'Pelo menos uma banda entre 2σ e 3σ: compatível com absorção, insuficiente para afirmar.').
regra(nao_detetada,  'Há bandas cobertas, mas nenhuma chega a 2σ.').
regra(sem_cobertura, 'Nenhuma banda tem pontos suficientes dentro e à volta.').

% ------------------------------------------------------------ literatura

%!  comparar(+Planeta, +Medidas, +Especie, +Estado, -Comparacao) is det.
comparar('', _, _, _, sem_referencia) :- !.
comparar(P, _, _, _, sem_referencia) :- \+ reportada(P, _, _), !.
comparar(P, Ms, E, Estado, C) :-
    (   reportada(P, E, _) -> R = sim ; R = nao ),
    (   R == sim, memberchk(Estado, [nao_detetada, indicio]),
        \+ ( banda(E, B, _, _), \+ banda_fraca(B), coberta(Ms, B) )
    ->  C = fora_do_alcance            % só bandas fracas cobertas
    ;   comparar_(R, Estado, C)
    ).

comparar_(sim, detetada,      concorda).
comparar_(sim, tentativa,     concorda_parcial).
comparar_(sim, indicio,       consistente).
comparar_(sim, nao_detetada,  falhou).
comparar_(sim, sem_cobertura, fora_do_alcance).
comparar_(nao, detetada,      nao_reportada).
comparar_(nao, tentativa,     nao_reportada).
comparar_(nao, indicio,       concorda).
comparar_(nao, nao_detetada,  concorda).
comparar_(nao, sem_cobertura, fora_do_alcance).
