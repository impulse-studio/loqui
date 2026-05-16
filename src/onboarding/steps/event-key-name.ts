export default function eventKeyName(e: KeyboardEvent): string {
  switch (e.key) {
    case " ": return "space";
    case "Control": return "ctrl";
    case "Alt": return "alt";
    case "Shift": return "shift";
    case "Meta": return "super";
    case "ArrowRight": return "right";
    case "ArrowLeft": return "left";
    case "ArrowUp": return "up";
    case "ArrowDown": return "down";
    default: return e.key.toLowerCase();
  }
}
