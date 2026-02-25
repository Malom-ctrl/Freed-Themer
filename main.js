class Themer {
  constructor(api) {
    this.api = api;
    this.themes = [];
    this.styleId = "themer-custom-styles";
    this.dropdownId = "settings-theme";
    this.optionClass = "themer-custom-option";
  }

  async activate() {
    this.themes = (await this.api.storage.get("themes")) || [];
    this.injectStyles();
    this.updateDropdown();

    this.api.ui.settings.addSection(
      "tab-appearance",
      "Custom Themes",
      (container) => {
        const btn = document.createElement("button");
        btn.className = "btn btn-outline themer-manage-btn";
        btn.textContent = "Manage Custom Themes";
        btn.onclick = () => {
          this.openThemeManager();
        };
        container.appendChild(btn);
      },
    );
  }

  openThemeManager() {
    // Create a modal for theme management
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop open themer-modal-backdrop";

    const modal = document.createElement("div");
    modal.className = "modal themer-modal";

    const header = document.createElement("div");
    header.className = "modal-header";

    const h3 = document.createElement("h3");
    h3.className = "themer-modal-header-title";
    h3.textContent = "Theme Manager";

    const closeBtn = document.createElement("button");
    closeBtn.className = "close-btn";

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "24");
    svg.setAttribute("height", "24");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");

    const line1 = document.createElementNS(svgNS, "line");
    line1.setAttribute("x1", "18");
    line1.setAttribute("y1", "6");
    line1.setAttribute("x2", "6");
    line1.setAttribute("y2", "18");
    const line2 = document.createElementNS(svgNS, "line");
    line2.setAttribute("x1", "6");
    line2.setAttribute("y1", "6");
    line2.setAttribute("x2", "18");
    line2.setAttribute("y2", "18");

    svg.appendChild(line1);
    svg.appendChild(line2);
    closeBtn.appendChild(svg);

    header.appendChild(h3);
    header.appendChild(closeBtn);

    const content = document.createElement("div");
    content.className = "modal-content themer-modal-content";

    modal.appendChild(header);
    modal.appendChild(content);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    // Close handler
    const close = () => backdrop.remove();
    header.querySelector(".close-btn").onclick = close;
    backdrop.onclick = (e) => {
      if (e.target === backdrop) close();
    };

    // Render content
    this.renderTab(content);
  }

  async deactivate() {
    const style = document.getElementById(this.styleId);
    if (style) style.remove();

    const options = document.querySelectorAll(`.${this.optionClass}`);
    options.forEach((opt) => opt.remove());
  }

  async saveThemes() {
    await this.api.storage.set("themes", this.themes);
    this.injectStyles();
    this.updateDropdown();
  }

  injectStyles() {
    let style = document.getElementById(this.styleId);
    if (!style) {
      style = document.createElement("style");
      style.id = this.styleId;
      document.head.appendChild(style);
    }

    let css = "";
    this.themes.forEach((theme) => {
      css += `[data-theme="${theme.id}"] {\n`;
      for (const [key, value] of Object.entries(theme.colors)) {
        css += `    ${key}: ${value};\n`;
      }
      css += "}\n";
    });

    style.textContent = css;
  }

  updateDropdown() {
    const select = document.getElementById(this.dropdownId);
    if (!select) return;

    // Remove existing custom options to avoid duplicates
    const existing = select.querySelectorAll(`.${this.optionClass}`);
    existing.forEach((opt) => opt.remove());

    // Add current themes
    this.themes.forEach((theme) => {
      const option = document.createElement("option");
      option.value = theme.id;
      option.textContent = theme.name;
      option.className = this.optionClass;
      select.appendChild(option);
    });

    // If current theme is one of ours, make sure it's selected
    const currentTheme = document.body.dataset.theme;
    if (currentTheme && this.themes.find((t) => t.id === currentTheme)) {
      select.value = currentTheme;
    }
  }

  renderTab(container) {
    while (container.firstChild) container.removeChild(container.firstChild);

    const header = document.createElement("div");
    header.className = "themer-tab-header";

    const title = document.createElement("h3");
    title.textContent = "Custom Themes";
    title.className = "themer-tab-title";

    const createBtn = document.createElement("button");
    createBtn.textContent = "Create New Theme";
    createBtn.className = "btn btn-primary";
    createBtn.onclick = () => this.renderEditor(container);

    header.appendChild(title);
    header.appendChild(createBtn);
    container.appendChild(header);

    if (this.themes.length === 0) {
      const empty = document.createElement("div");
      empty.textContent = "No custom themes created yet.";
      empty.className = "themer-empty-state";
      container.appendChild(empty);
      return;
    }

    const list = document.createElement("div");
    list.className = "themer-theme-list";

    this.themes.forEach((theme) => {
      const item = document.createElement("div");
      item.className = "themer-theme-item";

      const info = document.createElement("div");
      const strong = document.createElement("strong");
      strong.textContent = theme.name;
      info.appendChild(strong);

      const actions = document.createElement("div");
      actions.className = "themer-theme-actions";

      const editBtn = document.createElement("button");
      editBtn.textContent = "Edit";
      editBtn.className = "btn btn-outline";
      editBtn.onclick = () => this.renderEditor(container, theme);

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.className = "btn btn-outline themer-btn-delete";
      deleteBtn.onclick = async () => {
        if (confirm(`Delete theme "${theme.name}"?`)) {
          this.themes = this.themes.filter((t) => t.id !== theme.id);
          await this.saveThemes();

          // If deleted theme was active, revert to system
          if (document.body.dataset.theme === theme.id) {
            localStorage.setItem("freed_theme", "system");
            delete document.body.dataset.theme;
            // Update select if visible
            const select = document.getElementById(this.dropdownId);
            if (select) select.value = "system";
          }

          this.renderTab(container);
        }
      };

      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);
      item.appendChild(info);
      item.appendChild(actions);
      list.appendChild(item);
    });

    container.appendChild(list);
  }

  getCurrentThemeColors() {
    const style = getComputedStyle(document.body);
    const colors = {};
    const keys = [
      "--bg-body",
      "--bg-sidebar",
      "--bg-card",
      "--text-main",
      "--text-muted",
      "--primary",
      "--primary-hover",
      "--border",
      "--scrollbar-thumb",
      "--scrollbar-thumb-hover",
      "--highlight-color",
    ];

    keys.forEach((key) => {
      const val = style.getPropertyValue(key).trim();
      colors[key] = this.api.ui.utils.rgbToHex(val);
    });
    return colors;
  }

  renderEditor(container, theme = null) {
    while (container.firstChild) container.removeChild(container.firstChild);

    const isNew = !theme;
    // Deep clone the theme to avoid modifying the original object in memory before saving
    const currentTheme = theme
      ? JSON.parse(JSON.stringify(theme))
      : {
          id: `custom-${Date.now()}`,
          name: "New Theme",
          colors: this.getCurrentThemeColors(),
        };

    const header = document.createElement("div");
    header.className = "themer-editor-header";
    const h3 = document.createElement("h3");
    h3.textContent = isNew ? "Create Theme" : "Edit Theme";
    header.appendChild(h3);
    container.appendChild(header);

    const form = document.createElement("div");
    form.className = "themer-editor-form";

    // Name Input
    const nameGroup = document.createElement("div");
    const nameLabel = document.createElement("label");
    nameLabel.className = "themer-input-label";
    nameLabel.textContent = "Theme Name";
    nameGroup.appendChild(nameLabel);

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = currentTheme.name;
    nameInput.className = "themer-text-input";
    nameGroup.appendChild(nameInput);
    form.appendChild(nameGroup);

    // Color Inputs
    const colorsContainer = document.createElement("div");
    colorsContainer.className = "themer-colors-grid";

    const colorLabels = {
      "--bg-body": "Body Background",
      "--bg-sidebar": "Sidebar Background",
      "--bg-card": "Card Background",
      "--text-main": "Main Text",
      "--text-muted": "Muted Text",
      "--primary": "Primary Color",
      "--primary-hover": "Primary Hover",
      "--border": "Border Color",
      "--scrollbar-thumb": "Scrollbar Thumb",
      "--scrollbar-thumb-hover": "Scrollbar Hover",
      "--highlight-color": "Highlight Color",
    };

    for (const [key, label] of Object.entries(colorLabels)) {
      const group = document.createElement("div");
      group.className = "themer-color-group";

      const labelEl = document.createElement("label");
      labelEl.textContent = label;
      labelEl.className = "themer-color-label";

      const inputWrapper = document.createElement("div");
      inputWrapper.className = "themer-color-input-wrapper";
      inputWrapper.style.background = currentTheme.colors[key] || "#000000";

      const input = document.createElement("input");
      input.type = "color";
      input.value = currentTheme.colors[key] || "#000000";
      input.className = "themer-color-input";

      input.onchange = (e) => {
        currentTheme.colors[key] = e.target.value;
        inputWrapper.style.background = e.target.value;
      };

      inputWrapper.appendChild(input);
      group.appendChild(labelEl);
      group.appendChild(inputWrapper);
      colorsContainer.appendChild(group);
    }
    form.appendChild(colorsContainer);

    // Actions
    const actions = document.createElement("div");
    actions.className = "themer-editor-actions";

    const saveBtn = document.createElement("button");
    saveBtn.textContent = "Save Theme";
    saveBtn.className = "btn btn-primary";
    saveBtn.onclick = async () => {
      currentTheme.name = nameInput.value;

      if (isNew) {
        this.themes.push(currentTheme);
      } else {
        const idx = this.themes.findIndex((t) => t.id === currentTheme.id);
        if (idx !== -1) {
          this.themes[idx] = currentTheme;
        }
      }

      await this.saveThemes();
      this.renderTab(container);
      this.api.ui.toast("Theme saved successfully");
    };

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.className = "btn btn-outline";
    cancelBtn.onclick = () => this.renderTab(container);

    actions.appendChild(saveBtn);
    actions.appendChild(cancelBtn);
    form.appendChild(actions);

    container.appendChild(form);
  }
}

export async function activate(api) {
  const themer = new Themer(api);
  await themer.activate();
}
