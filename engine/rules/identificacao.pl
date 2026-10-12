:- encoding(utf8).

/*  Identificação do planeta.

    Os CSVs não trazem o nome do planeta. A decisão combina três pistas:
      1. hash do conteúdo         -> já carregado?
      2. nome sugerido (ficheiro) -> existe na base?
      3. raios R* e Rp            -> compatíveis com algum planeta (z < 3)?
    e a referência do raio estelar como desempate.

    A regra é conservadora: só responde "existe" quando o nome e os raios
    concordam, ou quando não há nome e um único candidato tem raios
    compatíveis E a mesma referência estelar. Tudo o resto é "ambiguo"
    (decide o utilizador) ou "novo".
*/
:- module(identificacao, [decidir/9, candidatos/5]).

:- use_module('../kb').

limiar_z(3.0).

%!  decidir(+Hash, +Nome, +Rs, +ERs, +Rp, +ERp, +Ref, -Decisao, -Motivos)
%   Nome = '' quando não foi possível sugerir um nome.
%   Decisao: duplicado(P) | existe(P) | ambiguo([Z-P,...]) | novo
decidir(Hash, _, _, _, _, _, _, duplicado(P), [M]) :-
    observacao(Hash, P, _, Fich, _, _), !,
    format(atom(M), 'Este espectro já foi carregado antes (~w).', [Fich]).
decidir(_, Nome, Rs, ERs, Rp, ERp, Ref, D, Ms) :-
    candidatos(Rs, ERs, Rp, ERp, Cs),
    decidir_(Nome, Ref, Rs, ERs, Rp, ERp, Cs, D, Ms).

% 1) Nome sugerido existe na base
decidir_(Nome, _, Rs, ERs, Rp, ERp, Cs, D, Ms) :-
    Nome \== '',
    nome_id(Nome, Id),
    planeta(Id, NomeKB, _, _, _, _, _), !,
    (   memberchk(Z-Id, Cs)
    ->  D = existe(Id),
        format(atom(M1), 'O nome do ficheiro corresponde a ~w, que já está na base.', [NomeKB]),
        format(atom(M2), 'Raios da estrela e do planeta compatíveis (z = ~2f).', [Z]),
        Ms = [M1, M2]
    ;   z_planeta(Rs, ERs, Rp, ERp, Id, Zid),
        D = ambiguo([Zid-Id|Cs]),
        format(atom(M1), 'O nome corresponde a ~w, mas os raios não são compatíveis (z = ~2f).', [NomeKB, Zid]),
        Ms = [M1, 'Pode ser outro planeta do mesmo sistema ou parâmetros estelares diferentes.']
    ).
% 2) Nome sugerido, mas desconhecido
decidir_(Nome, _, _, _, _, _, Cs, D, Ms) :-
    Nome \== '', !,
    (   Cs == []
    ->  D = novo,
        format(atom(M1), '~w não está na base.', [Nome]),
        Ms = [M1, 'Nenhum planeta da base tem raios compatíveis.']
    ;   D = ambiguo(Cs),
        format(atom(M1), '~w não está na base, mas há planetas com raios compatíveis.', [Nome]),
        Ms = [M1, 'Os raios sozinhos não chegam para distinguir planetas.']
    ).
% 3) Sem nome: só raios e referência estelar
decidir_('', Ref, _, _, _, _, Cs, D, Ms) :-
    (   Cs == []
    ->  D = novo,
        Ms = ['Nenhum planeta da base tem raios compatíveis.']
    ;   Cs = [Z-Id], planeta(Id, NomeKB, _, _, _, _, Ref)
    ->  D = existe(Id),
        format(atom(M1), 'Único candidato com raios compatíveis: ~w (z = ~2f).', [NomeKB, Z]),
        Ms = [M1, 'A referência do raio estelar também coincide.']
    ;   D = ambiguo(Cs),
        Ms = ['Sem nome no ficheiro e sem pistas suficientes para escolher um planeta.']
    ).

%!  candidatos(+Rs, +ERs, +Rp, +ERp, -Cs) is det.
%   Cs = [Z-Id, ...] ordenado por Z, só com Z < limiar.
candidatos(Rs, ERs, Rp, ERp, Cs) :-
    limiar_z(L),
    findall(Z-Id,
            ( planeta(Id, _, _, _, _, _, _),
              z_planeta(Rs, ERs, Rp, ERp, Id, Z),
              Z < L ),
            Ps),
    keysort(Ps, Cs).

% z combinado: pior dos dois raios, com os erros somados em quadratura
z_planeta(Rs, ERs, Rp, ERp, Id, Z) :-
    planeta(Id, _, Rs0, ERs0, Rp0, ERp0, _),
    z(Rs, ERs, Rs0, ERs0, Zs),
    z(Rp, ERp, Rp0, ERp0, Zp),
    Z is max(Zs, Zp).

z(A, EA, B, EB, Z) :-
    S is max(sqrt(EA*EA + EB*EB), 1.0e-6),
    Z is abs(A - B) / S.
