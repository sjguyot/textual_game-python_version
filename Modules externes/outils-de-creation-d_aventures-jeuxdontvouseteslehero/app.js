const board = document.getElementById("board");
const links = document.getElementById("links");
const addNodeBtn = document.getElementById("add-node");
const deleteNodeBtn = document.getElementById("delete-node");
const exportBtn = document.getElementById("export-yaml");
const importInput = document.getElementById("import-yaml");
const validateBtn = document.getElementById("validate");

const storyTitle = document.getElementById("story-title");
const statEndurance = document.getElementById("stat-endurance");
const statHabilete = document.getElementById("stat-habilete");
const statChance = document.getElementById("stat-chance");

const nodeIpInput = document.getElementById("node-ip");
const nodeIpRandomBtn = document.getElementById("node-ip-random");
const nodeTextInput = document.getElementById("node-text");
const choicesList = document.getElementById("choices-list");
const addChoiceBtn = document.getElementById("add-choice");
const validationOutput = document.getElementById("validation");

const state = {
  title: "New Adventure",
  window: { width: 900, height: 600 },
  stats: { endurance: 20, habilete: 10, chance: 10 },
  inventory: [],
  flags: {},
  start: 1,
  nodes: new Map(),
};

let selectedNodeId = null;
let dragState = null;

function nextNodeId() {
  const taken = new Set(state.nodes.keys());
  for (let value = 2; value <= 400; value += 1) {
    if (!taken.has(value)) {
      return value;
    }
  }
  return null;
}

function createNode(id, x, y) {
  state.nodes.set(id, {
    id,
    text: "",
    x,
    y,
    choices: [],
  });
}

function renameNode(oldId, newId) {
  if (!state.nodes.has(oldId)) {
    return;
  }
  if (oldId === 1 || newId === 1) {
    if (oldId !== 1 || newId !== 1) {
      alert("Node 1 is reserved as Start.");
      return;
    }
  }
  if (oldId === newId) {
    return;
  }
  if (state.nodes.has(newId)) {
    alert("That IP already exists.");
    return;
  }

  const node = state.nodes.get(oldId);
  state.nodes.delete(oldId);
  node.id = newId;
  state.nodes.set(newId, node);

  state.nodes.forEach((other) => {
    other.choices.forEach((choice) => {
      if (choice.goto === oldId) {
        choice.goto = newId;
      }
    });
  });

  selectedNodeId = newId;
  renderNodes();
  syncPanel();
}

function findClosestAvailable(target, currentId) {
  const taken = new Set(state.nodes.keys());
  if (currentId) {
    taken.delete(currentId);
  }
  const clamped = Math.min(400, Math.max(2, target));
  if (!taken.has(clamped)) {
    return clamped;
  }
  for (let offset = 1; offset <= 398; offset += 1) {
    const up = clamped + offset;
    if (up <= 400 && !taken.has(up)) {
      return up;
    }
    const down = clamped - offset;
    if (down >= 2 && !taken.has(down)) {
      return down;
    }
  }
  return null;
}

function selectNode(id) {
  selectedNodeId = id;
  renderNodes();
  syncPanel();
}

function syncPanel() {
  storyTitle.value = state.title;
  statEndurance.value = state.stats.endurance;
  statHabilete.value = state.stats.habilete;
  statChance.value = state.stats.chance;

  if (!selectedNodeId || !state.nodes.has(selectedNodeId)) {
    nodeIpInput.value = "";
    nodeIpInput.disabled = true;
    nodeIpRandomBtn.disabled = true;
    nodeTextInput.value = "";
    choicesList.innerHTML = "";
    return;
  }

  const node = state.nodes.get(selectedNodeId);
  nodeIpInput.value = node.id;
  const isStart = node.id === 1;
  nodeIpInput.disabled = isStart;
  nodeIpRandomBtn.disabled = isStart;
  nodeTextInput.value = node.text;

  renderChoices(node);
}

function renderChoices(node) {
  choicesList.innerHTML = "";
  const ids = Array.from(state.nodes.keys()).sort((a, b) => a - b);

  node.choices.forEach((choice, index) => {
    const container = document.createElement("div");
    container.className = "choice-item";

    const textLabel = document.createElement("label");
    textLabel.textContent = "Text";
    const textInput = document.createElement("input");
    textInput.type = "text";
    textInput.value = choice.text;
    textInput.addEventListener("input", () => {
      choice.text = textInput.value;
      renderNodes();
    });
    textLabel.appendChild(textInput);

    const gotoLabel = document.createElement("label");
    gotoLabel.textContent = "Goto";
    const gotoSelect = document.createElement("select");
    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = "-";
    gotoSelect.appendChild(emptyOption);

    ids.forEach((id) => {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = id;
      if (choice.goto === id) {
        option.selected = true;
      }
      gotoSelect.appendChild(option);
    });

    gotoSelect.addEventListener("change", () => {
      choice.goto = gotoSelect.value ? Number(gotoSelect.value) : null;
      renderLinks();
    });

    gotoLabel.appendChild(gotoSelect);

    const actions = document.createElement("div");
    actions.className = "choice-actions";
    const removeBtn = document.createElement("button");
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => {
      node.choices.splice(index, 1);
      renderChoices(node);
      renderLinks();
    });
    actions.appendChild(removeBtn);

    container.appendChild(textLabel);
    container.appendChild(gotoLabel);
    container.appendChild(actions);

    choicesList.appendChild(container);
  });
}

function renderNodes() {
  board.querySelectorAll(".node").forEach((el) => el.remove());

  state.nodes.forEach((node) => {
    const el = document.createElement("div");
    el.className = "node";
    if (node.id === selectedNodeId) {
      el.classList.add("selected");
    }
    el.style.left = `${node.x}px`;
    el.style.top = `${node.y}px`;

    const idEl = document.createElement("div");
    idEl.className = "node-id";
    idEl.textContent = node.id === 1 ? "Start (1)" : `#${node.id}`;

    const textEl = document.createElement("div");
    textEl.className = "node-text";
    textEl.textContent = node.text || "(empty)";

    el.appendChild(idEl);
    el.appendChild(textEl);

    el.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      selectNode(node.id);
      dragState = {
        id: node.id,
        startX: event.clientX,
        startY: event.clientY,
        originX: node.x,
        originY: node.y,
      };
      el.setPointerCapture(event.pointerId);
    });

    el.addEventListener("pointermove", (event) => {
      if (!dragState || dragState.id !== node.id) {
        return;
      }
      const dx = event.clientX - dragState.startX;
      const dy = event.clientY - dragState.startY;
      node.x = dragState.originX + dx;
      node.y = dragState.originY + dy;
      el.style.left = `${node.x}px`;
      el.style.top = `${node.y}px`;
      if (selectedNodeId === node.id) {
        nodeTextInput.value = node.text;
      }
      renderLinks();
    });

    el.addEventListener("pointerup", () => {
      dragState = null;
    });

    board.appendChild(el);
  });

  renderLinks();
}

function renderLinks() {
  links.innerHTML = "";
  state.nodes.forEach((node) => {
    node.choices.forEach((choice) => {
      if (!choice.goto || !state.nodes.has(choice.goto)) {
        return;
      }
      const target = state.nodes.get(choice.goto);
      const x1 = node.x + 220;
      const y1 = node.y + 30;
      const x2 = target.x;
      const y2 = target.y + 30;

      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", x1);
      line.setAttribute("y1", y1);
      line.setAttribute("x2", x2);
      line.setAttribute("y2", y2);
      line.setAttribute("stroke", "#5c4b2c");
      line.setAttribute("stroke-width", "2");
      links.appendChild(line);
    });
  });
}

function buildYaml() {
  const lines = [];
  const push = (line) => lines.push(line);
  const q = (value) => `"${String(value).replace(/\\/g, "\\\\").replace(/\"/g, "\\\"")}"`;

  push(`title: ${q(state.title)}`);
  push("stats:");
  push(`  endurance: ${state.stats.endurance}`);
  push(`  habilete: ${state.stats.habilete}`);
  push(`  chance: ${state.stats.chance}`);
  push("");
  push("inventory: []");
  push("flags: {}");
  push("");
  push("start: 1");
  push("");
  push("nodes:");

  const ids = Array.from(state.nodes.keys()).sort((a, b) => a - b);
  ids.forEach((id) => {
    const node = state.nodes.get(id);
    push(`  ${id}:`);
    push("    text: |");
    const textLines = (node.text || "").split("\n");
    if (!textLines.length || (textLines.length === 1 && textLines[0] === "")) {
      push("      ");
    } else {
      textLines.forEach((line) => {
        push(`      ${line}`);
      });
    }
    push("    choices:");
    if (!node.choices.length) {
      push("      []");
    } else {
      node.choices.forEach((choice) => {
        push("      - text: " + q(choice.text || ""));
        if (choice.goto) {
          push(`        goto: ${choice.goto}`);
        }
      });
    }
  });

  return lines.join("\n") + "\n";
}

function validate() {
  const errors = [];
  const ids = new Set(state.nodes.keys());
  if (!ids.has(state.start)) {
    errors.push(`Start node ${state.start} does not exist.`);
  }
  state.nodes.forEach((node) => {
    node.choices.forEach((choice, index) => {
      if (choice.goto && !ids.has(choice.goto)) {
        errors.push(`Node ${node.id} choice ${index + 1} goto ${choice.goto} missing.`);
      }
    });
  });
  validationOutput.textContent = errors.length ? errors.join("\n") : "No errors.";
}

function importYaml(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = window.jsyaml.load(reader.result);
      loadStateFromYaml(data);
      validationOutput.textContent = "Imported.";
    } catch (error) {
      validationOutput.textContent = `Import failed: ${error.message}`;
    }
  };
  reader.readAsText(file);
}

function loadStateFromYaml(data) {
  state.title = data.title || "Imported Adventure";
  state.window = data.window || { width: 900, height: 600 };
  state.stats = data.stats || { endurance: 20, habilete: 10, chance: 10 };
  state.inventory = data.inventory || [];
  state.flags = data.flags || {};
  state.start = 1;
  state.nodes.clear();

  const nodes = data.nodes || {};
  const ids = Object.keys(nodes).map((id) => Number(id)).sort((a, b) => a - b);
  ids.forEach((id, index) => {
    const nodeData = nodes[id];
    const x = 80 + (index % 5) * 260;
    const y = 60 + Math.floor(index / 5) * 140;
    const choices = (nodeData.choices || []).map((choice) => ({
      text: choice.text || "",
      goto: choice.goto ? Number(choice.goto) : null,
    }));
    state.nodes.set(id, {
      id,
      text: nodeData.text || "",
      x,
      y,
      choices,
    });
  });

  if (!ids.length) {
    createNode(1, 80, 60);
    selectedNodeId = 1;
  } else {
    selectedNodeId = ids[0];
  }
  renderNodes();
  syncPanel();
}

addNodeBtn.addEventListener("click", () => {
  const id = nextNodeId();
  if (!id) {
    alert("No free IP available between 2 and 400.");
    return;
  }
  const index = state.nodes.size;
  const x = 80 + (index % 5) * 260;
  const y = 60 + Math.floor(index / 5) * 140;
  createNode(id, x, y);
  selectNode(id);
});

deleteNodeBtn.addEventListener("click", () => {
  if (!selectedNodeId) {
    return;
  }
  state.nodes.delete(selectedNodeId);
  state.nodes.forEach((node) => {
    node.choices = node.choices.filter((choice) => choice.goto !== selectedNodeId);
  });
  selectedNodeId = null;
  renderNodes();
  syncPanel();
});

addChoiceBtn.addEventListener("click", () => {
  if (!selectedNodeId) {
    return;
  }
  const node = state.nodes.get(selectedNodeId);
  node.choices.push({ text: "", goto: null });
  renderChoices(node);
});

storyTitle.addEventListener("input", () => {
  state.title = storyTitle.value;
});

statEndurance.addEventListener("input", () => {
  state.stats.endurance = Number(statEndurance.value || 0);
});

statHabilete.addEventListener("input", () => {
  state.stats.habilete = Number(statHabilete.value || 0);
});

statChance.addEventListener("input", () => {
  state.stats.chance = Number(statChance.value || 0);
});

nodeTextInput.addEventListener("input", () => {
  if (!selectedNodeId) {
    return;
  }
  const node = state.nodes.get(selectedNodeId);
  node.text = nodeTextInput.value;
  renderNodes();
});

nodeIpInput.addEventListener("blur", () => {
  if (!selectedNodeId) {
    return;
  }
  if (selectedNodeId === 1) {
    nodeIpInput.value = 1;
    return;
  }
  const rawValue = Number(nodeIpInput.value || 0);
  if (!Number.isInteger(rawValue)) {
    nodeIpInput.value = selectedNodeId;
    return;
  }
  const nextId = findClosestAvailable(rawValue, selectedNodeId);
  if (!nextId) {
    alert("No free IP available between 2 and 400.");
    nodeIpInput.value = selectedNodeId;
    return;
  }
  renameNode(selectedNodeId, nextId);
});

nodeIpRandomBtn.addEventListener("click", () => {
  if (!selectedNodeId) {
    return;
  }
  if (selectedNodeId === 1) {
    return;
  }
  const taken = new Set(state.nodes.keys());
  const available = [];
  for (let value = 2; value <= 400; value += 1) {
    if (!taken.has(value)) {
      available.push(value);
    }
  }
  if (!available.length) {
    alert("No free IP available between 2 and 400.");
    return;
  }
  const randomIndex = Math.floor(Math.random() * available.length);
  renameNode(selectedNodeId, available[randomIndex]);
});

exportBtn.addEventListener("click", () => {
  const yamlText = buildYaml();
  const blob = new Blob([yamlText], { type: "text/yaml" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "adventure.yml";
  link.click();
  URL.revokeObjectURL(url);
});

importInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) {
    importYaml(file);
  }
});

validateBtn.addEventListener("click", validate);

createNode(1, 80, 60);
selectNode(1);
