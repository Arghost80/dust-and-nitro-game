from circuit_builder import make_circuit_from_steps
import json

def generate_six_tracks():
    tracks = {}

    # 1. SARTHE ENDURANCE (26x17)
    # Long Mulsanne straight, Dunlop chicane, Porsche curves, Indianapolis & Arnage
    # Start: (6, 14)
    sarthe_steps = (
        ['R'] * 15 +  # (21, 14)
        ['U'] * 4 +   # (21, 10)
        ['L'] * 3 +   # (18, 10)
        ['U'] * 4 +   # (18, 6)
        ['R'] * 4 +   # (22, 6)
        ['U'] * 3 +   # (22, 3)
        ['L'] * 18 +  # (4, 3) Mulsanne Straight (18 tiles!)
        ['D'] * 5 +   # (4, 8)
        ['R'] * 4 +   # (8, 8) Indianapolis Chicane
        ['D'] * 3 +   # (8, 11)
        ['L'] * 4 +   # (4, 11) Arnage Hairpin entry
        ['D'] * 3 +   # (4, 14)
        ['R'] * 2     # (6, 14) Closes!
    )
    tracks['sarthe_endurance'] = make_circuit_from_steps(
        'sarthe_endurance',
        'SARTHE 24H SPEEDWAY (Resistencia Le Mans)',
        26, 17, (6, 14), sarthe_steps, finish_step_idx=6
    )

    # 2. SILVERSTONE AIRFIELD (24x16)
    # Copse, Maggotts, Becketts, Hangar Straight, Stowe, Vale, Club
    # Start: (5, 12)
    silverstone_steps = (
        ['R'] * 14 +  # (19, 12) Main Straight
        ['U'] * 5 +   # (19, 7) Copse
        ['L'] * 4 +   # (15, 7) Maggotts
        ['U'] * 4 +   # (15, 3) Becketts
        ['L'] * 11 +  # (4, 3) Hangar Straight (11 tiles!)
        ['D'] * 7 +   # (4, 10) Stowe
        ['R'] * 5 +   # (9, 10) Vale
        ['D'] * 4 +   # (9, 14) Club Entry
        ['L'] * 5 +   # (4, 14) Club Sweeper
        ['U'] * 2 +   # (4, 12) Club Exit
        ['R'] * 1     # (5, 12) Closes!
    )
    tracks['silverstone_airfield'] = make_circuit_from_steps(
        'silverstone_airfield',
        'SILVERSTONE GP AIRFIELD (Gran Bretaña)',
        24, 16, (5, 12), silverstone_steps, finish_step_idx=7
    )

    # 3. RIVIERA COAST (22x15) - Mónaco / Costa Azul
    # Sainte Dévote, Massenet, Casino, Mirabeau, Hairpin, Tunnel, Chicane, Rascasse
    # Start: (5, 13)
    riviera_steps = (
        ['R'] * 12 +  # (17, 13) Pit Straight
        ['U'] * 3 +   # (17, 10) Sainte Dévote
        ['L'] * 3 +   # (14, 10) Beau Rivage
        ['U'] * 4 +   # (14, 6) Massenet
        ['R'] * 4 +   # (18, 6) Casino Square
        ['U'] * 3 +   # (18, 3)
        ['L'] * 14 +  # (4, 3) Tunnel & Harbor Section
        ['D'] * 4 +   # (4, 7) Nouvelle Chicane
        ['R'] * 5 +   # (9, 7) Tabac
        ['D'] * 4 +   # (9, 11) Swimming Pool
        ['L'] * 5 +   # (4, 11) La Rascasse
        ['D'] * 2 +   # (4, 13) Anthony Noghes
        ['R'] * 1     # (5, 13) Closes!
    )
    tracks['riviera_coast'] = make_circuit_from_steps(
        'riviera_coast',
        'RIVIERA AZUR SPEEDWAY (Costa de Mónaco)',
        22, 15, (5, 13), riviera_steps, finish_step_idx=6
    )

    # 4. NORDKETTE PASS (22x16) - Paso Alpino
    # Start: (6, 14)
    nordkette_steps = (
        ['R'] * 12 +  # (18, 14) Valley Straight
        ['U'] * 3 +   # (18, 11) Mountain Climb
        ['L'] * 5 +   # (13, 11)
        ['U'] * 3 +   # (13, 8) Switchback 1
        ['R'] * 5 +   # (18, 8)
        ['U'] * 4 +   # (18, 4) Summit hairpin
        ['L'] * 14 +  # (4, 4) High Altitude Crest
        ['D'] * 4 +   # (4, 8) Descent
        ['R'] * 4 +   # (8, 8) Forest S-curve
        ['D'] * 3 +   # (8, 11)
        ['L'] * 4 +   # (4, 11) Pine tree chicane
        ['D'] * 3 +   # (4, 14)
        ['R'] * 2     # (6, 14) Closes!
    )
    tracks['nordkette_pass'] = make_circuit_from_steps(
        'nordkette_pass',
        'NORDKETTE ALPINE PASS (Austria Alpina)',
        22, 16, (6, 14), nordkette_steps, finish_step_idx=5
    )

    # 5. NEO TOKYO BAY (22x16) - Odaiba Bay Loop
    # Start: (6, 13)
    tokyo_steps = (
        ['R'] * 12 +  # (18, 13) Rainbow Bridge Straight
        ['U'] * 4 +   # (18, 9)
        ['L'] * 4 +   # (14, 9) Wangan Chicane
        ['U'] * 3 +   # (14, 6)
        ['R'] * 4 +   # (18, 6)
        ['U'] * 3 +   # (18, 3) Waterfront Loop
        ['L'] * 14 +  # (4, 3) High-speed expressway
        ['D'] * 4 +   # (4, 7) Docks Hairpin
        ['R'] * 6 +   # (10, 7) Container Terminal
        ['D'] * 3 +   # (10, 10)
        ['L'] * 6 +   # (4, 10) C1 Inner Curve
        ['D'] * 3 +   # (4, 13)
        ['R'] * 2     # (6, 13) Closes!
    )
    tracks['neo_tokyo_bay'] = make_circuit_from_steps(
        'neo_tokyo_bay',
        'NEO-TOKYO HARBOR BAY (Japón Wangan)',
        22, 16, (6, 13), tokyo_steps, finish_step_idx=5
    )

    # 6. INTER LAGUNA (20x15) - Interlagos GP
    # Senna S, Curva do Sol, Reta Oposta, Ferradura, Bico de Pato, Junção
    # Start: (5, 12)
    inter_steps = (
        ['R'] * 11 +  # (16, 12) Finish Straight
        ['U'] * 3 +   # (16, 9) Senna S entry
        ['L'] * 3 +   # (13, 9) Senna S middle
        ['U'] * 3 +   # (13, 6) Curva do Sol
        ['R'] * 4 +   # (17, 6)
        ['U'] * 3 +   # (17, 3) Reta Oposta entry
        ['L'] * 13 +  # (4, 3) Reta Oposta (13 tiles!)
        ['D'] * 4 +   # (4, 7) Descida do Lago
        ['R'] * 4 +   # (8, 7) Ferradura
        ['D'] * 3 +   # (8, 10) Bico de Pato
        ['L'] * 4 +   # (4, 10) Junção entry
        ['D'] * 2 +   # (4, 12) Subida dos Boxes
        ['R'] * 1     # (5, 12) Closes!
    )
    tracks['inter_laguna'] = make_circuit_from_steps(
        'inter_laguna',
        'INTER-LAGUNA AUTODROMO (Brasil GP)',
        20, 15, (5, 12), inter_steps, finish_step_idx=5
    )

    print("All 6 professional circuits generated successfully!")
    return tracks

if __name__ == '__main__':
    t_dict = generate_six_tracks()
    for tid, t in t_dict.items():
        road = [x for x in t['tiles'] if x['t'] != 'grass']
        print(f"Track {tid:20s}: {len(road)} road tiles, {len(t['nodes'])} nodes, {len(t['objects'])} objects")
