:- encoding(utf8).

/*  Seed da base de conhecimento.

    Versão 1: base inicial (6 planetas, 7 espécies).
    Versão 2: mais espécies e bandas; espécies reportadas na literatura.

    Aplicação (ver kb.pl):
      - base vazia: carrega tudo;
      - base existente com versão anterior: acrescenta só o que falta
        (espécies, bandas), sem apagar nem alterar nada do utilizador;
      - espécies reportadas: aplicadas a todos os planetas que existam na base,
        incluindo os criados mais tarde pela interface (pelo id do nome).

    Janelas espectrais: aproximadas, centradas nas bandas vibracionais mais
    fortes. Confirmar com HITRAN/ExoMol antes de uso científico.
*/
:- module(seed, [versao_seed/1, seed_planeta/6, seed_especie/2, seed_banda/4, seed_reportada/3]).

versao_seed(2).

% ------------------------------------------------------------------ planetas
% seed_planeta(Nome, R_estrela, Err, R_planeta_RJ, Err, Ref_estrela)
seed_planeta('HAT-P-30 b',  1.31,  0.13,  1.404, 0.140, 'Stassun et al. 2017').
seed_planeta('Kepler-51 d', 0.87,  0.04,  0.810, 0.041, 'Masuda et al. 2024').
seed_planeta('NGTS-2 b',    1.702, 0.047, 1.644, 0.045, 'Raynard et al. 2018').
seed_planeta('TOI-199 b',   0.82,  0.003, 0.820, 0.013, 'Hobson et al. 2023').
seed_planeta('TOI-5205 b',  0.392, 0.015, 0.947, 0.037, 'Cañas et al. 2026').
% No CSV original o ST_RAD aparecia como "01/07/2026" (Excel converteu 1.07).
seed_planeta('WASP-96 b',   1.07,  0.005, 1.239, 0.010, 'Wang et al. 2026').

% ------------------------------------------------------------------ espécies
seed_especie(na,   'Na').
seed_especie(k,    'K').
seed_especie(he,   'He').
seed_especie(h2o,  'H₂O').
seed_especie(ch4,  'CH₄').
seed_especie(co2,  'CO₂').
seed_especie(co,   'CO').
seed_especie(so2,  'SO₂').
seed_especie(h2s,  'H₂S').
seed_especie(nh3,  'NH₃').
seed_especie(hcn,  'HCN').
seed_especie(c2h2, 'C₂H₂').
seed_especie(ocs,  'OCS').
seed_especie(sio,  'SiO').

% ------------------------------------------------------------------ bandas
% seed_banda(Especie, IdBanda, LambdaMin_um, LambdaMax_um)
% Visível e infravermelho próximo (NIRISS, NIRSpec)
seed_banda(na,   na_059,   0.580, 0.600).    % dubleto D
seed_banda(k,    k_077,    0.760, 0.780).    % dubleto de ressonância
seed_banda(he,   he_108,   1.080, 1.086).    % tripleto metastável; linha estreita
seed_banda(h2o,  h2o_115,  1.100, 1.200).
seed_banda(h2o,  h2o_14,   1.300, 1.500).
seed_banda(h2o,  h2o_19,   1.800, 2.000).
seed_banda(h2o,  h2o_27,   2.600, 3.000).
seed_banda(ch4,  ch4_17,   1.620, 1.780).
seed_banda(ch4,  ch4_23,   2.200, 2.400).
seed_banda(ch4,  ch4_33,   3.200, 3.450).
seed_banda(co2,  co2_20,   2.000, 2.080).    % fraca
seed_banda(nh3,  nh3_30,   3.000, 3.100).    % sobrepõe-se a HCN e C₂H₂
seed_banda(hcn,  hcn_30,   3.000, 3.100).
seed_banda(c2h2, c2h2_30,  3.000, 3.100).
seed_banda(h2s,  h2s_38,   3.650, 3.950).
seed_banda(so2,  so2_40,   3.950, 4.150).
seed_banda(sio,  sio_41,   4.000, 4.200).    % sobretom; sobrepõe-se ao SO₂
seed_banda(co2,  co2_43,   4.200, 4.450).
seed_banda(co,   co_46,    4.550, 4.850).
seed_banda(ocs,  ocs_49,   4.850, 4.950).
% Infravermelho médio (MIRI)
seed_banda(h2o,  h2o_63,   5.500, 7.000).
seed_banda(so2,  so2_73,   7.200, 7.600).
seed_banda(ch4,  ch4_77,   7.400, 8.000).
seed_banda(sio,  sio_81,   7.900, 8.400).
seed_banda(so2,  so2_87,   8.500, 9.000).
seed_banda(nh3,  nh3_105, 10.200, 10.900).
seed_banda(c2h2, c2h2_137,13.500, 13.900).
seed_banda(hcn,  hcn_140, 13.800, 14.200).
seed_banda(co2,  co2_150, 14.500, 15.500).

% ------------------------------------------------------------------ reportadas
% seed_reportada(PlanetaId, Especie, Fonte)
% Só deteções afirmadas pelos autores. Sinais tentativos ficam de fora.
% PlanetaId = nome sem pontuação, em minúsculas (ex.: 'WASP-96 b' -> wasp96b).

% Planetas do seed
seed_reportada(hatp30b,  h2o, 'Claringbold et al. 2026').
seed_reportada(hatp30b,  co2, 'Claringbold et al. 2026').
% kepler51d: espectro sem moléculas, declive por névoas (Libby-Roberts et al. 2026)
seed_reportada(ngts2b,   h2o, 'Fairman et al. 2026').
seed_reportada(ngts2b,   co2, 'Fairman et al. 2026').
seed_reportada(toi199b,  ch4, 'Bello-Arufe et al. 2026').
seed_reportada(toi5205b, ch4, 'Cañas et al. 2026').
seed_reportada(toi5205b, h2s, 'Cañas et al. 2026').
seed_reportada(wasp96b,  h2o, 'Wang et al. 2026').
seed_reportada(wasp96b,  na,  'Wang et al. 2026').
seed_reportada(wasp96b,  k,   'Wang et al. 2026').
seed_reportada(wasp96b,  co2, 'Radica et al. 2026').

% Planetas acrescentados pela interface (aplicados se existirem na base)
seed_reportada(hatp18b,  h2o, 'Fournier-Tondreau et al. 2024').
seed_reportada(hatp18b,  co2, 'Fournier-Tondreau et al. 2024').
seed_reportada(hatp18b,  he,  'Fu et al. 2022').
seed_reportada(k218b,    ch4, 'Schmidt et al. 2025').   % CO₂ e DMS não confirmados na reanálise
% lhs475b: espectro plano, sem atmosfera detetada
seed_reportada(toi270d,  ch4, 'Benneke et al. 2024').
seed_reportada(toi270d,  co2, 'Benneke et al. 2024').
seed_reportada(toi732c,  ch4, 'Rigby et al. 2025').
seed_reportada(wasp17b,  h2o, 'Louie et al. 2025').
seed_reportada(wasp17b,  k,   'Louie et al. 2025').
seed_reportada(wasp121b, h2o, 'Gapp et al. 2025').
seed_reportada(wasp121b, sio, 'Gapp et al. 2025').
