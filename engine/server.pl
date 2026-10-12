:- encoding(utf8).

/*  Motor de inferência — servidor HTTP/JSON.

    GET  /health        estado do serviço
    GET  /base          planetas, espécies, bandas, reportadas, nº de observações
    GET  /planeta?id=   um planeta: parâmetros, espectros registados e espécies reportadas
    POST /decidir       identificação: duplicado | existe | ambiguo | novo
    POST /inferir       deteção de espécies a partir das medidas por banda
    POST /planetas      cria planeta
    POST /observacoes   associa um espectro a um planeta
    POST /especies      cria espécie com as suas bandas
    POST /reportadas    regista uma espécie reportada num artigo
*/
:- use_module(library(http/thread_httpd)).
:- use_module(library(http/http_dispatch)).
:- use_module(library(http/http_json)).
:- use_module(library(apply)).
:- use_module(library(pairs)).
:- use_module(library(http/http_parameters)).

:- use_module(kb).
:- use_module(rules/identificacao).
:- use_module(rules/detecao).

:- http_handler(root(health),      h_health,      [method(get)]).
:- http_handler(root(base),        h_base,        [method(get)]).
:- http_handler(root(planeta),     h_planeta,     [method(get)]).
:- http_handler(root(decidir),     h_decidir,     [method(post)]).
:- http_handler(root(inferir),     h_inferir,     [method(post)]).
:- http_handler(root(planetas),    h_planetas,    [method(post)]).
:- http_handler(root(observacoes), h_observacoes, [method(post)]).
:- http_handler(root(especies),    h_especies,    [method(post)]).
:- http_handler(root(reportadas),  h_reportadas,  [method(post)]).

:- initialization(main, main).

main :-
    env('KB_PATH', '/data/kb.journal', Path),
    env('PORT', '8080', PortA), atom_number(PortA, Port),
    kb_open(Path),
    http_server(http_dispatch, [port(Port)]),
    format(user_error, "Motor de inferência a ouvir na porta ~w (base: ~w)~n", [Port, Path]),
    thread_get_message(_).                     % mantém o processo vivo

env(Nome, Def, V) :- ( getenv(Nome, V0) -> V = V0 ; V = Def ).

%   ---- utilitários ----

responder(Goal) :-
    catch(( call(Goal, Resp), reply_json_dict(Resp) ),
          E,
          erro(E)).

erro(erro_kb(conflito, M))       :- !, reply_json_dict(_{erro: M}, [status(409)]).
erro(erro_kb(nao_encontrado, M)) :- !, reply_json_dict(_{erro: M}, [status(404)]).
erro(erro_pedido(M))             :- !, reply_json_dict(_{erro: M}, [status(400)]).
erro(E) :-
    print_message(error, E),
    format(string(M), "~q", [E]),
    reply_json_dict(_{erro: M}, [status(500)]).

corpo(Req, D) :- http_read_json_dict(Req, D, [value_string_as(atom)]).

campo(D, K, V) :-
    (   get_dict(K, D, V0), V0 \== null
    ->  V = V0
    ;   format(atom(M), 'Falta o campo "~w".', [K]), throw(erro_pedido(M)) ).
campo(D, K, Def, V) :- ( get_dict(K, D, V0), V0 \== null -> V = V0 ; V = Def ).

numero(D, K, N) :-
    campo(D, K, V),
    (   number(V) -> N = V
    ;   format(atom(M), 'O campo "~w" tem de ser numérico.', [K]), throw(erro_pedido(M)) ).

nome_planeta(Id, Nome) :- ( planeta(Id, Nome, _, _, _, _, _) -> true ; Nome = Id ).

%   ---- handlers ----

h_health(_) :- reply_json_dict(_{ok: true}).

h_base(_) :- responder(base_json).

base_json(_{planetas: Ps, especies: Es, reportadas: Rs}) :-
    findall(_{id: Id, nome: N, rs: Rs0, ers: ERs, rp: Rp, erp: ERp, ref: Ref, observacoes: NO},
            ( planeta(Id, N, Rs0, ERs, Rp, ERp, Ref),
              aggregate_all(count, observacao(_, Id, _, _, _, _), NO) ),
            Ps),
    findall(_{id: E, nome: N, bandas: Bs},
            ( especie(E, N),
              findall(_{id: B, lmin: L0, lmax: L1}, banda(E, B, L0, L1), Bs) ),
            Es),
    findall(_{planeta: P, especie: E, fonte: F}, reportada(P, E, F), Rs).

h_planeta(Req) :-
    http_parameters(Req, [id(Id0, [atom])]),
    responder(planeta_detalhe(Id0)).

planeta_detalhe(Id0, _{planeta: P, observacoes: Os, reportadas: Rs}) :-
    nome_id(Id0, Id),
    (   planeta(Id, N, Rs0, ERs, Rp, ERp, Ref)
    ->  true
    ;   throw(erro_kb(nao_encontrado, 'Planeta desconhecido.'))
    ),
    P = _{id: Id, nome: N, rs: Rs0, ers: ERs, rp: Rp, erp: ERp, ref: Ref},
    findall(_{hash: H, autores: A, ficheiro: F, lmin: L0, lmax: L1},
            observacao(H, Id, A, F, L0, L1), Os),
    findall(_{especie: E, nome: NE, fonte: Fo},
            ( reportada(Id, E, Fo), ( especie(E, NE) -> true ; NE = E ) ), Rs).

h_decidir(Req) :-
    corpo(Req, D),
    responder(decidir_json(D)).

decidir_json(D, _{decisao: Tipo, planeta: P, nome: NomeP, candidatos: Cands, motivos: Ms}) :-
    campo(D, hash, H),
    campo(D, nome, '', Nome),
    numero(D, rs, Rs), numero(D, ers, ERs),
    numero(D, rp, Rp), numero(D, erp, ERp),
    campo(D, ref, '', Ref),
    decidir(H, Nome, Rs, ERs, Rp, ERp, Ref, Dec, Ms),
    (   Dec = duplicado(P) -> Tipo = duplicado, Cs = []
    ;   Dec = existe(P)    -> Tipo = existe,    Cs = []
    ;   Dec = ambiguo(Cs)  -> Tipo = ambiguo,   P = null
    ;   Dec == novo        -> Tipo = novo,      P = null, Cs = []
    ),
    ( P == null -> NomeP = null ; nome_planeta(P, NomeP) ),
    findall(_{id: Id, nome: N, z: Z}, ( member(Z-Id, Cs), nome_planeta(Id, N) ), Cands).

h_inferir(Req) :-
    corpo(Req, D),
    responder(inferir_json(D)).

inferir_json(D, _{especies: Out, limiares: _{forte: F, fraca: W, indicio: I}}) :-
    campo(D, medidas, MsJ),
    campo(D, planeta, '', P),
    campo(D, rs, null, Rs0),
    maplist(medida, MsJ, Ms),
    raio_contexto(P, Rs0, Rs),
    limiar(forte, F), limiar(fraca, W), limiar(indicio, I),
    avaliar_todas(Ms, Rs, Res),
    findall(Obj,
            ( member(r(E, Estado, Motivo, Falta, Alertas), Res),
              especie(E, Nome),
              regra(Estado, Regra),
              comparar(P, Ms, E, Estado, Comp),
              ( reportada(P, E, Fonte) -> true ; Fonte = null ),
              findall(_{id: B, lmin: L0, lmax: L1, coberta: Cob, sigma: S},
                      ( banda(E, B, L0, L1),
                        ( memberchk(m(B, Cob, S), Ms) -> true ; Cob = false, S = null ) ),
                      Bs),
              Obj = _{id: E, nome: Nome, estado: Estado, motivo: Motivo, regra: Regra,
                      falta: Falta, alertas: Alertas,
                      comparacao: Comp, fonte: Fonte, bandas: Bs} ),
            Out).

%   Raio da estrela para as regras de contexto: o do pedido ou, se faltar,
%   o do planeta na base.
raio_contexto(_, Rs, Rs) :- number(Rs), !.
raio_contexto(P, _, Rs) :- P \== '', planeta(P, _, Rs, _, _, _, _), !.
raio_contexto(_, _, none).

medida(J, m(B, Cob, S)) :-
    campo(J, banda, B),
    campo(J, coberta, Cob),
    campo(J, sigma, null, S).

h_planetas(Req) :-
    corpo(Req, D),
    responder(planeta_json(D)).

planeta_json(D, _{id: Id, status: Status}) :-
    campo(D, nome, Nome),
    ( Nome == '' -> throw(erro_pedido('O nome do planeta não pode estar vazio.')) ; true ),
    numero(D, rs, Rs), numero(D, ers, ERs),
    numero(D, rp, Rp), numero(D, erp, ERp),
    campo(D, ref, '', Ref),
    kb_add_planeta(Nome, Rs, ERs, Rp, ERp, Ref, Id, Status),
    (   Status == ja_existia
    ->  throw(erro_kb(conflito, 'Já existe um planeta com esse nome.'))
    ;   true ).

h_observacoes(Req) :-
    corpo(Req, D),
    responder(observacao_json(D)).

observacao_json(D, _{ok: true}) :-
    campo(D, hash, H), campo(D, planeta, P),
    campo(D, autores, '', A), campo(D, ficheiro, '', F),
    numero(D, lmin, L0), numero(D, lmax, L1),
    kb_add_observacao(H, P, A, F, L0, L1).

h_especies(Req) :-
    corpo(Req, D),
    responder(especie_json(D)).

especie_json(D, _{id: Id}) :-
    campo(D, nome, Nome),
    campo(D, id, '', Id0),
    ( Id0 == '' -> nome_id(Nome, Id) ; nome_id(Id0, Id) ),
    ( Id == '' -> throw(erro_pedido('Id da espécie inválido.')) ; true ),
    campo(D, bandas, BsJ),
    ( BsJ == [] -> throw(erro_pedido('Indica pelo menos uma banda.')) ; true ),
    maplist(banda_json(Id), BsJ, Bs),
    kb_add_especie(Id, Nome, Bs).

banda_json(E, J, b(B, L0, L1)) :-
    numero(J, lmin, L0), numero(J, lmax, L1),
    (   L0 > 0, L1 > L0 -> true
    ;   throw(erro_pedido('Cada banda precisa de 0 < λ mínimo < λ máximo.')) ),
    (   campo(J, id, '', B0), B0 \== ''
    ->  nome_id(B0, B)
    ;   X is round(L0*100), format(atom(B), '~w_~w', [E, X]) ).

h_reportadas(Req) :-
    corpo(Req, D),
    responder(reportada_json(D)).

reportada_json(D, _{ok: true}) :-
    campo(D, planeta, P), campo(D, especie, E), campo(D, fonte, F),
    kb_add_reportada(P, E, F).
