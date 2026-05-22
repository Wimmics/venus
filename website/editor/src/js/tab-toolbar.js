export class TabToolbar {
  constructor({ holderId, actions = [] }) {
    this.holderId = holderId;
    this.actions = actions;
    this.holderEl = null;
  }

  init() {
    this.holderEl = document.getElementById(this.holderId);
    if (!this.holderEl) {
      throw new Error(`Tab toolbar holder not found: #${this.holderId}`);
    }

    this.holderEl.innerHTML = "";
    for (const action of this.actions) {
      this.holderEl.appendChild(action.createElement ? action.createElement() : this.createButton(action));
    }
  }

  createButton(action) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn btn-sm btn-outline-secondary";
    button.title = action.title || "";
    button.setAttribute("aria-label", action.title || action.id);
    button.innerHTML = `<i class="${action.iconClass}" aria-hidden="true"></i>`;
    button.addEventListener("click", () => {
      Promise.resolve(action.onClick?.()).catch((error) => {
        console.error(error);
      });
    });
    return button;
  }
}
