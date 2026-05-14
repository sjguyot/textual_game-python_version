# Textual Game

This project is a Python engine for "choose your own adventure" stories. You write adventures in YAML and run them with a simple Tkinter UI.

## Run the game

```bash
python3.14 game.py adventures/demo.yml
```

## YAML Guide

This guide explains how to encode an adventure in YAML for the engine.

### General structure

```yaml
title: "Adventure title"
window:
  width: 900
  height: 600
# background: assets/background.png   # optional, PNG only

stats:
  endurance: 20
  habilete: 10
  chance: 10

inventory:
  - rope
  - torch

flags: {}

start: 1

nodes:
  1:
    text: |
      Paragraph 1 text.
    choices:
      - text: Go to paragraph 2
        goto: 2
```

### Nodes (paragraphs)

Each paragraph is a numeric key inside `nodes`.
Available fields:
- `text`: paragraph text (use `|` for multiple lines)
- `image`: relative PNG path (optional)
- `effects`: effects applied when entering the paragraph
- `choices`: list of choices (empty => end)

Example:

```yaml
nodes:
  12:
    text: |
      You enter the cave. It is cold.
    image: assets/cave.png
    effects:
      - change_stat:
          stat: endurance
          delta: -1
    choices:
      - text: Continue
        goto: 13
      - text: Run away
        goto: 7
```

### Simple choices

```yaml
choices:
  - text: Go to paragraph 5
    goto: 5
```

### Choices with conditions

```yaml
choices:
  - text: Brandish the dagger
    conditions:
      - has_item: dagger
    goto: 22
```

Possible conditions:
- `has_item: dagger`
- `stat_at_least: { stat: endurance, value: 12 }`
- `stat_at_most: { stat: chance, value: 5 }`
- `flag_true: keyFound`

### Possible effects

```yaml
effects:
  - change_stat:
      stat: endurance
      delta: -2
  - set_stat:
      stat: chance
      value: 8
  - add_item: dagger
  - remove_item: rope
  - set_flag:
      flag: keyFound
      value: true
```

### Luck test / stat test

```yaml
choices:
  - text: Test your luck
    check:
      stat: chance
      dice:
        count: 2
        sides: 6
      compare: lte        # lte = success if roll <= stat
      consume_stat: true  # optional: lower stat by 1 after test
      success: 30
      failure: 18
```

Compare values:
- `lte`: success if roll <= stat
- `gte`: success if roll >= stat

### Tips for 400 paragraphs

- Use numbers: 1..400
- Verify each `goto`, `success`, `failure` points to an existing number.
- Avoid duplicate IDs.

## Other option

There is a tool to help create adventures here: https://github.com/sjguyot/textual-game-helper-tools-adventure.
Or the web version directly at https://sjguyot.github.io/textual-game-helper-tools-adventure/.