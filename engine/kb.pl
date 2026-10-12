:- encoding(utf8).

/*  Base de conhecimento persistente.

    Os factos ficam num journal em disco (library(persistency)). No Docker
    o caminho aponta para um volume, por isso sobrevivem a reinícios.

    Separação importante:
      - planeta/7, especie/2, banda/4, reportada/3  -> conhecimento curado
      - observacao/6                                -> espectros já vistos
      As moléculas INFERIDAS pelas regras nunca são gravadas aqui.
*/
:- module(kb,
          [ kb_open/1,
            planeta/7,
            observacao/6,
            especie/2,
            banda/4,
            reportada/3,
            kb_add_planeta/8,
            kb_add_observacao/6,
            kb_add_especie/3,
            kb_add_reportada/3,
            nome_id/2
          ]).

:- use_module(library(persistency)).
:- use_module(library(filesex)).
:- use_module(seed).

:- persistent
     planeta(id:atom, nome:atom,
             r_estrela:number, err_r_estrela:number,
             r_planeta:number, err_r_planeta:number,
             ref_estrela:atom),
     observacao(hash:atom, planeta:atom, autores:atom, ficheiro:atom,
                lmin:number, lmax:number),
     especie(id:atom, nome:atom),
     banda(especie:atom, id:atom, lmin:number, lmax:number),
     reportada(planeta:atom, especie:atom, fonte:atom),
     semeado(versao:integer).

%!  kb_open(+Path) is det.
%   Liga o journal. Base vazia: carrega o seed completo. Base de uma versão
%   anterior do seed: acrescenta só o que falta. Em todos os casos aplica as
%   espécies reportadas aos planetas que existam.
kb_open(Path) :-
    file_directory_name(Path, Dir),
    make_directory_path(Dir),
    db_attach(Path, []),
    versao_seed(N),
    (   semeado(V)
    ->  ( V < N -> atualizar_seed(V, N) ; true )
    ;   carregar_seed(N)
    ),
    aplicar_reportadas.

carregar_seed(N) :-
    with_mutex(kb,
      ( forall(seed_planeta(Nome, Rs, ERs, Rp, ERp, Ref),
               ( nome_id(Nome, Id), assert_planeta(Id, Nome, Rs, ERs, Rp, ERp, Ref) )),
        acrescentar_especies_e_bandas,
        assert_semeado(N)
      )),
    print_message(informational, format("Base semeada (versão ~w do seed)", [N])).

%   Atualização não destrutiva: só acrescenta o que ainda não existe.
atualizar_seed(V, N) :-
    with_mutex(kb,
      ( forall(seed_planeta(Nome, Rs, ERs, Rp, ERp, Ref),
               ( nome_id(Nome, Id),
                 ( planeta(Id, _, _, _, _, _, _) -> true
                 ; assert_planeta(Id, Nome, Rs, ERs, Rp, ERp, Ref) ) )),
        acrescentar_especies_e_bandas,
        retractall_semeado(_),
        assert_semeado(N)
      )),
    print_message(informational, format("Seed atualizado da versão ~w para ~w", [V, N])).

acrescentar_especies_e_bandas :-
    forall(seed_especie(E, Nome),
           ( especie(E, _) -> true ; assert_especie(E, Nome) )),
    forall(seed_banda(E, B, L0, L1),
           ( banda(_, B, _, _) -> true ; assert_banda(E, B, L0, L1) )).

%   Espécies reportadas da literatura, para todos os planetas existentes.
aplicar_reportadas :-
    with_mutex(kb, forall(planeta(Id, _, _, _, _, _, _), aplicar_reportadas_(Id))).

aplicar_reportadas_(Id) :-
    forall(( seed_reportada(Id, E, F), especie(E, _), \+ reportada(Id, E, F) ),
           assert_reportada(Id, E, F)).

%!  nome_id(+Nome, -Id) is det.
%   "WASP-96 b", "WASP-96-b" e "wasp96b" dão todos o id wasp96b.
nome_id(Nome, Id) :-
    atom_codes(Nome, Cs0),
    include([C]>>code_type(C, alnum), Cs0, Cs1),
    atom_codes(A, Cs1),
    downcase_atom(A, Id).

%   ---- escrita (sempre sob mutex) ----

kb_add_planeta(Nome, Rs, ERs, Rp, ERp, Ref, Id, Status) :-
    nome_id(Nome, Id),
    with_mutex(kb,
      (   planeta(Id, _, _, _, _, _, _)
      ->  Status = ja_existia
      ;   assert_planeta(Id, Nome, Rs, ERs, Rp, ERp, Ref),
          aplicar_reportadas_(Id),
          Status = criado
      )).

kb_add_observacao(Hash, Planeta, Autores, Ficheiro, L0, L1) :-
    with_mutex(kb,
      (   observacao(Hash, _, _, _, _, _)
      ->  true
      ;   must_be_planeta(Planeta),
          assert_observacao(Hash, Planeta, Autores, Ficheiro, L0, L1)
      )).

kb_add_especie(Id, Nome, Bandas) :-
    with_mutex(kb,
      (   especie(Id, _)
      ->  throw(erro_kb(conflito, 'Essa espécie já existe na base.'))
      ;   forall(member(b(B, _, _), Bandas),
                 (   banda(_, B, _, _)
                 ->  throw(erro_kb(conflito, 'Já existe uma banda com esse id.'))
                 ;   true )),
          assert_especie(Id, Nome),
          forall(member(b(B, L0, L1), Bandas), assert_banda(Id, B, L0, L1))
      )).

kb_add_reportada(Planeta, Especie, Fonte) :-
    with_mutex(kb,
      (   must_be_planeta(Planeta),
          (   especie(Especie, _) -> true
          ;   throw(erro_kb(nao_encontrado, 'Espécie desconhecida.')) ),
          (   reportada(Planeta, Especie, Fonte) -> true
          ;   assert_reportada(Planeta, Especie, Fonte) )
      )).

must_be_planeta(P) :-
    (   planeta(P, _, _, _, _, _, _) -> true
    ;   throw(erro_kb(nao_encontrado, 'Planeta desconhecido.')) ).
