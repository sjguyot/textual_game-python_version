# Guide YAML

Ce guide explique comment encoder une aventure en YAML pour le moteur.

## Lancer le jeu

```bash
python3.14 game.py adventures/demo.yml
```

## Structure generale

```yaml
title: "Titre de l'aventure"
window:
  width: 900
  height: 600
# background: assets/fond.png   # optionnel, PNG seulement

stats:
  endurance: 20
  habilete: 10
  chance: 10

inventory:
  - corde
  - torche

flags: {}

start: 1

nodes:
  1:
    text: |
      Texte du paragraphe 1.
    choices:
      - text: Aller au paragraphe 2
        goto: 2
```

## Noeuds (paragraphes)

Chaque paragraphe est une cle numerique dans `nodes`.
Champs possibles:
- `text`: texte du paragraphe (utiliser `|` pour plusieurs lignes)
- `image`: chemin PNG relatif (optionnel)
- `effects`: effets appliques en entrant dans le paragraphe
- `choices`: liste de choix (si vide => fin)

Exemple:

```yaml
nodes:
  12:
    text: |
      Vous entrez dans la grotte. Il fait froid.
    image: assets/grotte.png
    effects:
      - change_stat:
          stat: endurance
          delta: -1
    choices:
      - text: Continuer
        goto: 13
      - text: Fuir
        goto: 7
```

## Choix simples

```yaml
choices:
  - text: Aller au paragraphe 5
    goto: 5
```

## Choix avec conditions

```yaml
choices:
  - text: Brandir la dague
    conditions:
      - has_item: dague
    goto: 22
```

Conditions possibles:
- `has_item: dague`
- `stat_at_least: { stat: endurance, value: 12 }`
- `stat_at_most: { stat: chance, value: 5 }`
- `flag_true: cleTrouvee`

## Effets possibles

```yaml
effects:
  - change_stat:
      stat: endurance
      delta: -2
  - set_stat:
      stat: chance
      value: 8
  - add_item: dague
  - remove_item: corde
  - set_flag:
      flag: cleTrouvee
      value: true
```

## Test de chance / test de stat

```yaml
choices:
  - text: Tester votre chance
    check:
      stat: chance
      dice:
        count: 2
        sides: 6
      compare: lte        # lte = reussite si jet <= stat
      consume_stat: true  # optionnel: baisse la stat de 1 apres le test
      success: 30
      failure: 18
```

Compare possible:
- `lte`: reussite si jet <= stat
- `gte`: reussite si jet >= stat

## Conseils pour 400 paragraphes

- Utiliser des numeros: 1..400
- Verifier que chaque `goto`, `success`, `failure` pointe vers un numero existant.
- Eviter les doublons d'id.

## Autre possibilité

Il existe un code qui aide à la création d'aventures: https://github.com/sjguyot/textual-game-helper-tools-adventure.
