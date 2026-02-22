export default class Themer {
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

    this.api.ui.settings.addTab("themer", "Themer", (container) =>
      this.renderTab(container),
    );
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
    container.innerHTML = "";

    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    header.style.alignItems = "center";
    header.style.marginBottom = "20px";

    const title = document.createElement("h3");
    title.textContent = "Custom Themes";
    title.style.margin = "0";

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
      empty.style.color = "var(--text-muted)";
      empty.style.textAlign = "center";
      empty.style.padding = "20px";
      container.appendChild(empty);
      return;
    }

    const list = document.createElement("div");
    list.style.display = "grid";
    list.style.gap = "10px";

    this.themes.forEach((theme) => {
      const item = document.createElement("div");
      item.style.border = "1px solid var(--border)";
      item.style.padding = "15px";
      item.style.borderRadius = "8px";
      item.style.display = "flex";
      item.style.justifyContent = "space-between";
      item.style.alignItems = "center";
      item.style.background = "var(--bg-card)";

      const info = document.createElement("div");
      info.innerHTML = `<strong>${theme.name}</strong>`;

      const actions = document.createElement("div");
      actions.style.display = "flex";
      actions.style.gap = "8px";

      const editBtn = document.createElement("button");
      editBtn.textContent = "Edit";
      editBtn.className = "btn btn-outline";
      editBtn.onclick = () => this.renderEditor(container, theme);

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.className = "btn btn-outline";
      deleteBtn.style.color = "#ef4444";
      deleteBtn.style.borderColor = "#ef4444";
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

  renderEditor(container, theme = null) {
    container.innerHTML = "";

    const isNew = !theme;
    // Deep clone the theme to avoid modifying the original object in memory before saving
    const currentTheme = theme
      ? JSON.parse(JSON.stringify(theme))
      : {
          id: `custom-${Date.now()}`,
          name: "New Theme",
          colors: {
            "--bg-body": "#ffffff",
            "--bg-sidebar": "#f8f9fa",
            "--bg-card": "#ffffff",
            "--text-main": "#1f2937",
            "--text-muted": "#6b7280",
            "--primary": "#4f46e5",
            "--primary-hover": "#4338ca",
            "--border": "#e5e7eb",
            "--scrollbar-thumb": "#d1d5db",
            "--scrollbar-thumb-hover": "#9ca3af",
            "--highlight-color": "#facc15",
          },
        };

    const header = document.createElement("div");
    header.style.marginBottom = "20px";
    header.innerHTML = `<h3>${isNew ? "Create Theme" : "Edit Theme"}</h3>`;
    container.appendChild(header);

    const form = document.createElement("div");
    form.style.display = "grid";
    form.style.gap = "15px";

    // Name Input
    const nameGroup = document.createElement("div");
    nameGroup.innerHTML = `<label style="display:block; margin-bottom:5px; font-weight:600;">Theme Name</label>`;
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = currentTheme.name;
    nameInput.style.width = "100%";
    nameInput.style.padding = "8px";
    nameInput.style.border = "1px solid var(--border)";
    nameInput.style.borderRadius = "4px";
    nameInput.style.background = "var(--bg-body)";
    nameInput.style.color = "var(--text-main)";
    nameGroup.appendChild(nameInput);
    form.appendChild(nameGroup);

    // Color Inputs
    const colorsContainer = document.createElement("div");
    colorsContainer.style.display = "grid";
    colorsContainer.style.gridTemplateColumns =
      "repeat(auto-fill, minmax(200px, 1fr))";
    colorsContainer.style.gap = "15px";

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
      group.innerHTML = `<label style="display:block; margin-bottom:5px; font-size:0.9rem;">${label}</label>`;

      const input = document.createElement("input");
      input.type = "color";
      input.value = currentTheme.colors[key] || "#000000";
      input.style.width = "100%";
      input.style.height = "40px";
      input.style.padding = "0";
      input.style.border = "1px solid var(--border)";
      input.style.borderRadius = "4px";
      input.style.cursor = "pointer";

      input.onchange = (e) => {
        currentTheme.colors[key] = e.target.value;
      };

      group.appendChild(input);
      colorsContainer.appendChild(group);
    }
    form.appendChild(colorsContainer);

    // Actions
    const actions = document.createElement("div");
    actions.style.marginTop = "20px";
    actions.style.display = "flex";
    actions.style.gap = "10px";

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
