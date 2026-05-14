import argparse
import json
import os
import random
import sys
import tkinter as tk
from tkinter import filedialog, messagebox

import yaml


class AdventureGame:
    def __init__(self, data, base_dir):
        self.data = data
        self.base_dir = base_dir
        self.title = data.get("title", "Adventure")
        self.window = data.get("window", {})
        self.background_default = data.get("background")
        self.stats = dict(data.get("stats", {}))
        self.inventory = list(data.get("inventory", []))
        self.flags = dict(data.get("flags", {}))
        self.nodes = data.get("nodes", {})
        self.current_node_id = data.get("start", "start")
        self.current_node = None
        self.rng = random.Random()
        self.last_roll_message = ""
        self.current_image = None
        self.resize_job = None
        self.fullscreen = False

        if self.current_node_id not in self.nodes:
            raise ValueError("Start node not found in nodes")

        self.root = tk.Tk()
        self.root.title(self.title)

        width = int(self.window.get("width", 900))
        height = int(self.window.get("height", 600))
        self.root.geometry(f"{width}x{height}")

        self.stats_var = tk.StringVar()
        self.stats_label = tk.Label(self.root, textvariable=self.stats_var)
        self.stats_label.pack(fill="x")

        self.controls_frame = tk.Frame(self.root)
        self.controls_frame.pack(fill="x", pady=4)
        tk.Button(self.controls_frame, text="Save", command=self.save_game).pack(side="left", padx=6)
        tk.Button(self.controls_frame, text="Load", command=self.load_game).pack(side="left", padx=6)
        tk.Button(self.controls_frame, text="Fullscreen", command=self.toggle_fullscreen).pack(
            side="left", padx=6
        )
        tk.Button(self.controls_frame, text="Quit", command=self.quit_game).pack(side="right", padx=6)

        self.canvas = tk.Canvas(self.root, width=width, height=height)
        self.canvas.bind("<Configure>", self.on_resize)

        self.choices_frame = tk.Frame(self.root)
        self.choices_frame.pack(fill="x", side="bottom")
        self.canvas.pack(fill="both", expand=True)

        self.root.bind("<F11>", self.toggle_fullscreen)
        self.root.bind("<Escape>", self.exit_fullscreen)
        self.root.bind("<Control-q>", self.quit_game)
        self.root.bind("<Command-q>", self.quit_game)

        self.update_node(self.current_node_id)

    def resolve_path(self, relative_path):
        if not relative_path:
            return None
        return os.path.join(self.base_dir, relative_path)

    def load_background(self, image_path):
        if not image_path:
            return None
        resolved = self.resolve_path(image_path)
        if not resolved or not os.path.exists(resolved):
            return None
        try:
            return tk.PhotoImage(file=resolved)
        except tk.TclError:
            return None

    def update_stats_label(self):
        stats_parts = [f"{key}: {value}" for key, value in self.stats.items()]
        inventory_part = ", ".join(self.inventory) if self.inventory else "(empty)"
        self.stats_var.set(" | ".join(stats_parts) + f" | Inventory: {inventory_part}")

    def check_conditions(self, conditions):
        if not conditions:
            return True
        for cond in conditions:
            if "stat_at_least" in cond:
                payload = cond["stat_at_least"]
                if self.stats.get(payload["stat"], 0) < payload["value"]:
                    return False
            elif "stat_at_most" in cond:
                payload = cond["stat_at_most"]
                if self.stats.get(payload["stat"], 0) > payload["value"]:
                    return False
            elif "has_item" in cond:
                if cond["has_item"] not in self.inventory:
                    return False
            elif "flag_true" in cond:
                if not self.flags.get(cond["flag_true"], False):
                    return False
        return True

    def apply_effects(self, effects):
        if not effects:
            return
        for effect in effects:
            if "change_stat" in effect:
                payload = effect["change_stat"]
                stat = payload["stat"]
                delta = payload.get("delta", 0)
                self.stats[stat] = self.stats.get(stat, 0) + delta
            elif "set_stat" in effect:
                payload = effect["set_stat"]
                self.stats[payload["stat"]] = payload["value"]
            elif "add_item" in effect:
                item = effect["add_item"]
                if item not in self.inventory:
                    self.inventory.append(item)
            elif "remove_item" in effect:
                item = effect["remove_item"]
                if item in self.inventory:
                    self.inventory.remove(item)
            elif "set_flag" in effect:
                payload = effect["set_flag"]
                self.flags[payload["flag"]] = payload.get("value", True)

    def roll_check(self, check):
        stat_name = check["stat"]
        dice = check.get("dice", {"count": 2, "sides": 6})
        count = dice.get("count", 2)
        sides = dice.get("sides", 6)
        modifier = check.get("modifier", 0)
        compare = check.get("compare", "lte")

        roll_total = sum(self.rng.randint(1, sides) for _ in range(count)) + modifier
        stat_value = self.stats.get(stat_name, 0)

        if compare == "gte":
            success = roll_total >= stat_value
        else:
            success = roll_total <= stat_value

        if check.get("consume_stat"):
            self.stats[stat_name] = max(0, stat_value - 1)

        self.last_roll_message = (
            f"Rolled {roll_total} vs {stat_name}={stat_value} -> "
            f"{'success' if success else 'failure'}"
        )
        return success

    def update_node(self, node_id):
        if node_id not in self.nodes:
            messagebox.showerror("Error", f"Node '{node_id}' not found")
            self.root.destroy()
            return

        self.current_node_id = node_id
        self.current_node = self.nodes[node_id]
        self.apply_effects(self.current_node.get("effects", []))
        self.update_stats_label()
        self.render_node()

    def render_node(self):
        if not self.current_node:
            return

        node = self.current_node
        self.canvas.delete("all")

        image_path = node.get("image") or self.background_default
        self.current_image = self.load_background(image_path)

        width = self.canvas.winfo_width() or int(self.window.get("width", 900))
        height = self.canvas.winfo_height() or int(self.window.get("height", 600))

        if self.current_image:
            self.canvas.create_image(0, 0, anchor="nw", image=self.current_image)
        else:
            self.canvas.create_rectangle(0, 0, width, height, fill="#f4f1e8", outline="")

        margin = 30
        box_height = int(height * 0.35)
        box_top = height - box_height - margin
        box_bottom = height - margin

        self.canvas.create_rectangle(
            margin,
            box_top,
            width - margin,
            box_bottom,
            fill="#fdf7e5",
            outline="#5c4b2c",
            width=2,
        )

        text_content = node.get("text", "")
        if self.last_roll_message:
            self.last_roll_message = ""

        self.canvas.create_text(
            margin + 15,
            box_top + 15,
            anchor="nw",
            width=width - (margin + 30),
            text=text_content,
            font=("Helvetica", 16),
            fill="#2b2417",
        )

        for widget in self.choices_frame.winfo_children():
            widget.destroy()

        choices = [choice for choice in node.get("choices", []) if self.check_conditions(choice.get("conditions"))]
        if not choices:
            tk.Button(self.choices_frame, text="Fin", command=self.root.destroy).pack(pady=8)
            return

        for choice in choices:
            label = choice.get("text", "Choice")
            btn = tk.Button(self.choices_frame, text=label, command=lambda c=choice: self.handle_choice(c))
            btn.pack(fill="x", padx=10, pady=4)

    def handle_choice(self, choice):
        self.apply_effects(choice.get("effects", []))

        if "check" in choice:
            success = self.roll_check(choice["check"])
            target = choice["check"]["success"] if success else choice["check"]["failure"]
            self.update_node(target)
            return

        target = choice.get("goto")
        if not target:
            return
        self.update_node(target)

    def on_resize(self, event):
        if self.resize_job:
            self.root.after_cancel(self.resize_job)
        self.resize_job = self.root.after(100, self.render_node)

    def toggle_fullscreen(self, event=None):
        self.fullscreen = not self.fullscreen
        self.root.attributes("-fullscreen", self.fullscreen)

    def exit_fullscreen(self, event=None):
        if self.fullscreen:
            self.fullscreen = False
            self.root.attributes("-fullscreen", False)

    def quit_game(self, event=None):
        self.root.destroy()

    def serialize_state(self):
        return {
            "node_id": self.current_node_id,
            "stats": self.stats,
            "inventory": self.inventory,
            "flags": self.flags,
        }

    def save_game(self):
        default_path = os.path.join(self.base_dir, "save.json")
        path = filedialog.asksaveasfilename(
            title="Save game",
            defaultextension=".json",
            initialfile=os.path.basename(default_path),
            initialdir=self.base_dir,
            filetypes=[("Save files", "*.json"), ("All files", "*.*")],
        )
        if not path:
            return
        try:
            with open(path, "w", encoding="utf-8") as handle:
                json.dump(self.serialize_state(), handle, indent=2)
        except OSError as exc:
            messagebox.showerror("Error", f"Failed to save: {exc}")

    def load_game(self):
        path = filedialog.askopenfilename(
            title="Load game",
            initialdir=self.base_dir,
            filetypes=[("Save files", "*.json"), ("All files", "*.*")],
        )
        if not path:
            return
        try:
            with open(path, "r", encoding="utf-8") as handle:
                data = json.load(handle)
        except (OSError, json.JSONDecodeError) as exc:
            messagebox.showerror("Error", f"Failed to load: {exc}")
            return

        node_id = data.get("node_id")
        if node_id not in self.nodes:
            messagebox.showerror("Error", "Save file does not match this adventure")
            return

        self.stats = dict(data.get("stats", {}))
        self.inventory = list(data.get("inventory", []))
        self.flags = dict(data.get("flags", {}))
        self.current_node_id = node_id
        self.current_node = self.nodes[node_id]
        self.update_stats_label()
        self.render_node()

    def run(self):
        self.root.mainloop()


def load_yaml(path):
    with open(path, "r", encoding="utf-8") as handle:
        return yaml.safe_load(handle)


def main():
    parser = argparse.ArgumentParser(description="Play a YAML adventure.")
    parser.add_argument("story", help="Path to the YAML story file")
    args = parser.parse_args()

    story_path = os.path.abspath(args.story)
    if not os.path.exists(story_path):
        print("Story file not found", file=sys.stderr)
        sys.exit(1)

    data = load_yaml(story_path)
    if not data:
        print("Story file is empty", file=sys.stderr)
        sys.exit(1)

    base_dir = os.path.dirname(story_path)
    game = AdventureGame(data, base_dir)
    game.run()


if __name__ == "__main__":
    main()
