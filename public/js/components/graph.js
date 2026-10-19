/**
 * GraphComponent - Obsidian-Style Cellular Knowledge Graph Controller
 * 
 * Provides an interactive 2D Force-Directed Graph View on HTML5 Canvas:
 * - Each Project is a primary Cell node
 * - Linked memories (ADRs, conventions, rules) orbit and connect via Obsidian [[wikilinks]]
 * - Full Obsidian visual fidelity: hover focus highlighting, link bezier glow, zoom/pan, dragging
 * - Node Inspector with in-place Markdown editing, backlink tracking, and inter-cell linking
 */
class GraphComponent {
  constructor(canvasId = 'obsidian-graph-canvas') {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

    this.nodes = [];
    this.links = [];
    this.nodeMap = new Map();
    this.stats = { totalNodes: 0, projectCells: 0, memoryCells: 0, totalLinks: 0 };

    // Viewport transform
    this.transform = {
      x: 0,
      y: 0,
      scale: 1.0,
      minScale: 0.2,
      maxScale: 3.5
    };

    // Interaction state
    this.hoveredNode = null;
    this.selectedNode = null;
    this.draggedNode = null;
    this.isPanning = false;
    this.panStart = { x: 0, y: 0 };
    this.activeFilter = 'all'; // 'all' | 'project' | 'memory'
    this.searchQuery = '';

    // Physics parameters (Tuned for organic cellular Obsidian layout)
    this.physics = {
      repulsion: -1400,
      springLength: 190,
      springStiffness: 0.024,
      centerGravity: 0.007,
      damping: 0.88,
      collisionPadding: 42,
      isRunning: true
    };

    if (this.canvas) {
      this.initCanvasSize();
      this.initEvents();
      this.initUIControls();
      this.loadGraph();
      this.startPhysicsLoop();
    }
  }

  initCanvasSize() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement ? this.canvas.parentElement.getBoundingClientRect() : this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = (rect.width || 600) * dpr;
    this.canvas.height = (rect.height || 450) * dpr;
    this.ctx.scale(dpr, dpr);
    this.width = rect.width || 600;
    this.height = rect.height || 450;
    this.transform.x = this.width / 2;
    this.transform.y = this.height / 2;
  }

  initEvents() {
    if (!this.canvas) return;

    window.addEventListener('resize', () => {
      this.initCanvasSize();
    });

    // 1. Mouse down (drag node or start pan)
    this.canvas.addEventListener('mousedown', (e) => {
      const pos = this.getCanvasMousePos(e);
      const clickedNode = this.findNodeAt(pos.x, pos.y);

      if (clickedNode) {
        this.draggedNode = clickedNode;
        this.draggedNode.isPinned = true;
      } else {
        this.isPanning = true;
        this.panStart = { x: e.clientX - this.transform.x, y: e.clientY - this.transform.y };
      }
    });

    // 2. Mouse move (pan, drag node, or update hover)
    this.canvas.addEventListener('mousemove', (e) => {
      if (this.isPanning) {
        this.transform.x = e.clientX - this.panStart.x;
        this.transform.y = e.clientY - this.panStart.y;
        return;
      }

      if (this.draggedNode) {
        const pos = this.getCanvasMousePos(e);
        this.draggedNode.x = pos.x;
        this.draggedNode.y = pos.y;
        this.draggedNode.vx = 0;
        this.draggedNode.vy = 0;
        this.physics.isRunning = true;
        return;
      }

      const pos = this.getCanvasMousePos(e);
      const prevHover = this.hoveredNode;
      this.hoveredNode = this.findNodeAt(pos.x, pos.y);

      if (prevHover !== this.hoveredNode) {
        this.canvas.style.cursor = this.hoveredNode ? 'pointer' : 'default';
      }
    });

    // 3. Mouse up / click
    this.canvas.addEventListener('mouseup', (e) => {
      if (this.draggedNode) {
        this.draggedNode.isPinned = false;
        this.draggedNode = null;
      }
      this.isPanning = false;
    });

    // 4. Click node to select / inspect
    this.canvas.addEventListener('click', (e) => {
      const pos = this.getCanvasMousePos(e);
      const clicked = this.findNodeAt(pos.x, pos.y);
      if (clicked) {
        this.selectNode(clicked);
      }
    });

    // 5. Wheel zoom (anchored to cursor)
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
      const newScale = Math.min(this.transform.maxScale, Math.max(this.transform.minScale, this.transform.scale * zoomFactor));

      if (newScale !== this.transform.scale) {
        // Anchor zoom to cursor position
        this.transform.x = mouseX - (mouseX - this.transform.x) * (newScale / this.transform.scale);
        this.transform.y = mouseY - (mouseY - this.transform.y) * (newScale / this.transform.scale);
        this.transform.scale = newScale;
      }
    }, { passive: false });
  }

  initUIControls() {
    // Search input
    const searchInput = document.getElementById('graph-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = (e.target.value || '').trim().toLowerCase();
      });
    }

    // Filter pills (All, Projects, Memories)
    const filterPills = document.querySelectorAll('.graph-filter-pill');
    filterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        filterPills.forEach(p => {
          p.classList.remove('bg-cyan-600/30', 'text-cyan-300', 'border-cyan-500/50');
          p.classList.add('bg-[#0c1222]', 'text-gray-400');
        });
        pill.classList.add('bg-cyan-600/30', 'text-cyan-300', 'border-cyan-500/50');
        pill.classList.remove('bg-[#0c1222]', 'text-gray-400');
        this.activeFilter = pill.getAttribute('data-filter') || 'all';
      });
    });

    // Center view button
    const btnCenter = document.getElementById('btn-graph-center');
    if (btnCenter) {
      btnCenter.addEventListener('click', () => this.centerView());
    }

    // New project cell button
    const btnNewCell = document.getElementById('btn-graph-new-cell');
    if (btnNewCell) {
      btnNewCell.addEventListener('click', () => this.openNewCellModal());
    }

    // Modal close
    const btnCloseInspector = document.getElementById('btn-close-cell-inspector');
    if (btnCloseInspector) {
      btnCloseInspector.addEventListener('click', () => this.closeInspector());
    }
  }

  getCanvasMousePos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;
    return {
      x: (rawX - this.transform.x) / this.transform.scale,
      y: (rawY - this.transform.y) / this.transform.scale
    };
  }

  findNodeAt(worldX, worldY) {
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const node = this.nodes[i];
      if (this.activeFilter !== 'all' && node.type !== this.activeFilter) continue;
      const dx = worldX - node.x;
      const dy = worldY - node.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= node.size + 4) {
        return node;
      }
    }
    return null;
  }

  async loadGraph() {
    try {
      const data = await window.API.fetchGraph();
      this.stats = data.stats || {};
      this.updateStatsUI();

      // Preserve existing positions if node already existed
      const existingPos = new Map();
      this.nodes.forEach(n => existingPos.set(n.id, { x: n.x, y: n.y, vx: n.vx, vy: n.vy }));

      this.nodes = (data.nodes || []).map((n, idx) => {
        const prev = existingPos.get(n.id);
        const angle = (idx / data.nodes.length) * Math.PI * 2;
        const radius = n.type === 'project' ? 150 + (idx % 3) * 60 : 260 + (idx % 4) * 70;

        return {
          ...n,
          x: prev ? prev.x : Math.cos(angle) * radius,
          y: prev ? prev.y : Math.sin(angle) * radius,
          vx: prev ? prev.vx : 0,
          vy: prev ? prev.vy : 0
        };
      });

      this.nodeMap.clear();
      this.nodes.forEach(n => this.nodeMap.set(n.id, n));

      // Resolve links
      this.links = (data.links || []).map(l => ({
        id: l.id,
        source: typeof l.source === 'object' ? l.source.id : l.source,
        target: typeof l.target === 'object' ? l.target.id : l.target,
        label: l.label || ''
      })).filter(l => this.nodeMap.has(l.source) && this.nodeMap.has(l.target));

      this.physics.isRunning = true;
      // Pre-warm physics simulation for clean non-overlapping distribution
      for (let i = 0; i < 45; i++) {
        this.updatePhysics();
      }
    } catch (e) {
      console.error('Failed to load knowledge graph:', e);
    }
  }

  updateStatsUI() {
    const elProjects = document.getElementById('graph-stat-projects');
    const elMemories = document.getElementById('graph-stat-memories');
    const elLinks = document.getElementById('graph-stat-links');

    if (elProjects) elProjects.textContent = this.stats.projectCells || 0;
    if (elMemories) elMemories.textContent = this.stats.memoryCells || 0;
    if (elLinks) elLinks.textContent = this.stats.totalLinks || 0;
  }

  startPhysicsLoop() {
    const tick = () => {
      if (this.physics.isRunning) {
        this.stepSimulation();
      }
      this.render();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  stepSimulation() {
    const nodes = this.nodes;
    const links = this.links;
    let totalVelocity = 0;

    // 1. Repulsion force between all nodes (Coulomb's law)
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;

        if (dist < 400) {
          const force = (this.physics.repulsion / (dist * dist)) * (a.type === 'project' ? 1.4 : 1.0);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          if (!a.isPinned) { a.vx += fx; a.vy += fy; }
          if (!b.isPinned) { b.vx -= fx; b.vy -= fy; }
        }

        // Collision avoidance
        const minDist = a.size + b.size + this.physics.collisionPadding;
        if (dist < minDist) {
          const overlap = (minDist - dist) * 0.5;
          const ox = (dx / dist) * overlap;
          const oy = (dy / dist) * overlap;
          if (!a.isPinned) { a.x -= ox; a.y -= oy; }
          if (!b.isPinned) { b.x += ox; b.y += oy; }
        }
      }
    }

    // 2. Spring attraction force along links (Hooke's law)
    for (const link of links) {
      const a = this.nodeMap.get(link.source);
      const b = this.nodeMap.get(link.target);
      if (!a || !b) continue;

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const diff = dist - this.physics.springLength;
      const force = diff * this.physics.springStiffness;

      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      if (!a.isPinned) { a.vx += fx; a.vy += fy; }
      if (!b.isPinned) { b.vx -= fx; b.vy -= fy; }
    }

    // 3. Center gravity (pulls graph toward center of world)
    for (const node of nodes) {
      if (node.isPinned) continue;
      node.vx -= node.x * this.physics.centerGravity;
      node.vy -= node.y * this.physics.centerGravity;

      // Apply damping & update positions
      node.vx *= this.physics.damping;
      node.vy *= this.physics.damping;
      node.x += node.vx;
      node.y += node.vy;

      totalVelocity += Math.abs(node.vx) + Math.abs(node.vy);
    }

    // Cooling threshold
    if (totalVelocity < 0.05 && !this.draggedNode) {
      this.physics.isRunning = false;
    }
  }

  render() {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const width = this.width;
    const height = this.height;

    ctx.clearRect(0, 0, width, height);

    ctx.save();
    // Apply viewport transform
    ctx.translate(this.transform.x, this.transform.y);
    ctx.scale(this.transform.scale, this.transform.scale);

    // Draw background subtle grid dots (Obsidian feel)
    this.renderGrid(ctx);

    // Determine focus set (for Obsidian hover highlighting)
    const connectedIds = new Set();
    if (this.hoveredNode) {
      connectedIds.add(this.hoveredNode.id);
      this.links.forEach(l => {
        if (l.source === this.hoveredNode.id) connectedIds.add(l.target);
        if (l.target === this.hoveredNode.id) connectedIds.add(l.source);
      });
    }

      // 1. Draw Links
      const now = Date.now();
      for (const link of this.links) {
        const a = this.nodeMap.get(link.source);
        const b = this.nodeMap.get(link.target);
        if (!a || !b) continue;

        if (this.activeFilter !== 'all') {
          if (a.type !== this.activeFilter && b.type !== this.activeFilter) continue;
        }

        const isFocused = this.hoveredNode && (connectedIds.has(a.id) && connectedIds.has(b.id));
        const isDimmed = this.hoveredNode && !isFocused;

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);

        if (isFocused) {
          ctx.strokeStyle = '#00f0ff';
          ctx.lineWidth = 2.4 / this.transform.scale;
          ctx.shadowColor = '#00f0ff';
          ctx.shadowBlur = 10;
        } else if (isDimmed) {
          ctx.strokeStyle = 'rgba(75, 85, 99, 0.12)';
          ctx.lineWidth = 1 / this.transform.scale;
          ctx.shadowBlur = 0;
        } else {
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
          ctx.lineWidth = 1.2 / this.transform.scale;
          ctx.shadowBlur = 0;
        }

        ctx.stroke();
        ctx.shadowBlur = 0; // reset

        // Energy pulse particle traveling along links
        const linkSpeed = isFocused ? 1400 : 2800;
        const seed = Math.abs((a.x * 13 + b.y * 17) % 1000);
        const t = ((now + seed) % linkSpeed) / linkSpeed;
        const px = a.x + (b.x - a.x) * t;
        const py = a.y + (b.y - a.y) * t;
        ctx.beginPath();
        ctx.arc(px, py, (isFocused ? 2.8 : 1.6) / this.transform.scale, 0, Math.PI * 2);
        ctx.fillStyle = isFocused ? '#ffffff' : (a.type === 'project' ? 'rgba(0, 240, 255, 0.7)' : 'rgba(168, 85, 247, 0.6)');
        if (isFocused) {
          ctx.shadowColor = '#00f0ff';
          ctx.shadowBlur = 8;
        }
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // 2. Draw Nodes (Cells)
      for (const node of this.nodes) {
        if (this.activeFilter !== 'all' && node.type !== this.activeFilter) continue;

        const isHovered = this.hoveredNode && this.hoveredNode.id === node.id;
        const isConnected = connectedIds.has(node.id);
        const isDimmed = this.hoveredNode && !isConnected;

        const isSearchMatch = this.searchQuery && (
          node.name.toLowerCase().includes(this.searchQuery) ||
          node.tags.some(t => t.toLowerCase().includes(this.searchQuery))
        );

        ctx.save();
        ctx.translate(node.x, node.y);

        // Node opacity
        if (isDimmed && !isSearchMatch) {
          ctx.globalAlpha = 0.18;
        } else {
          ctx.globalAlpha = 1.0;
        }

        const baseRadius = node.size;
        const pulse = Math.sin(now / 380 + node.x * 0.05) * 2;
        const radius = isHovered ? baseRadius * 1.3 : baseRadius;

        // Glow halo on project cells or hovered node
        if (isHovered || isSearchMatch || node.type === 'project') {
          ctx.beginPath();
          ctx.arc(0, 0, radius + 6 + (node.type === 'project' ? pulse : 0), 0, Math.PI * 2);
          ctx.fillStyle = node.color ? `${node.color}35` : 'rgba(0, 240, 255, 0.22)';
          ctx.fill();
        }

        // Outer ring
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fillStyle = node.color || '#00f0ff';
        ctx.fill();

        // Inner core
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // Label (Obsidian clean typography with protective glass pill)
        const fontSize = Math.max(10, Math.round(11 / Math.sqrt(this.transform.scale)));
        ctx.font = `${isHovered ? '600 ' : '400 '}${fontSize}px 'JetBrains Mono', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        if (isHovered || isSearchMatch || this.transform.scale > 0.65 || node.type === 'project') {
          const text = node.name;
          const metrics = ctx.measureText(text);
          const textWidth = metrics.width;
          const pillHeight = fontSize + 6;
          const pillY = radius + 4;

          // Translucent dark pill backdrop
          ctx.fillStyle = isHovered ? 'rgba(8, 14, 30, 0.92)' : 'rgba(3, 5, 12, 0.78)';
          ctx.strokeStyle = isHovered ? 'rgba(0, 240, 255, 0.5)' : 'rgba(255, 255, 255, 0.08)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(-textWidth / 2 - 5, pillY, textWidth + 10, pillHeight, 4);
          } else {
            ctx.rect(-textWidth / 2 - 5, pillY, textWidth + 10, pillHeight);
          }
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = isHovered ? '#ffffff' : (node.type === 'project' ? '#38bdf8' : '#e2e8f0');
          ctx.fillText(text, 0, pillY + 3);
        }

        ctx.restore();
      }

      ctx.restore();
    }

  renderGrid(ctx) {
    const gridSize = 40;
    const viewLeft = -this.transform.x / this.transform.scale;
    const viewTop = -this.transform.y / this.transform.scale;
    const viewRight = viewLeft + this.width / this.transform.scale;
    const viewBottom = viewTop + this.height / this.transform.scale;

    const startX = Math.floor(viewLeft / gridSize) * gridSize;
    const startY = Math.floor(viewTop / gridSize) * gridSize;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    for (let x = startX; x < viewRight; x += gridSize) {
      for (let y = startY; y < viewBottom; y += gridSize) {
        ctx.fillRect(x - 0.75, y - 0.75, 1.5, 1.5);
      }
    }
  }

  centerView() {
    this.transform.x = this.width / 2;
    this.transform.y = this.height / 2;
    this.transform.scale = 1.15;
    this.physics.isRunning = true;
  }

  async selectNode(node) {
    this.selectedNode = node;
    const inspector = document.getElementById('cell-inspector-panel');
    if (!inspector) return;

    inspector.classList.remove('hidden');

    try {
      const cellData = await window.API.fetchCell(node.id);
      this.renderInspector(cellData);
    } catch (e) {
      this.renderInspector(node);
    }
  }

  renderInspector(cell) {
    const elTitle = document.getElementById('inspector-cell-title');
    const elBadge = document.getElementById('inspector-cell-badge');
    const elTags = document.getElementById('inspector-cell-tags');
    const elLinks = document.getElementById('inspector-cell-links');
    const elBacklinks = document.getElementById('inspector-cell-backlinks');
    const elEditor = document.getElementById('inspector-cell-editor');
    const btnSave = document.getElementById('btn-save-inspector-cell');

    if (elTitle) elTitle.textContent = cell.name;
    if (elBadge) {
      elBadge.textContent = cell.type === 'project' ? '🪐 PROJECT CELL' : '🧠 MEMORY CELL';
      elBadge.className = cell.type === 'project' 
        ? 'text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/40'
        : 'text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-purple-950 text-purple-300 border border-purple-500/40';
    }

    if (elTags) {
      elTags.innerHTML = (cell.tags || []).map(t => `<span class="px-1.5 py-0.2 rounded bg-black/50 text-[10px] text-gray-300 font-mono">#${t}</span>`).join(' ');
    }

    if (elLinks) {
      const links = cell.wikilinks || [];
      if (links.length === 0) {
        elLinks.innerHTML = '<span class="text-gray-500 italic text-[11px]">No outgoing links</span>';
      } else {
        elLinks.innerHTML = links.map(l => `
          <button onclick="window.graphComp.jumpToNode('${l.targetId}')" class="px-2 py-0.5 rounded bg-[#0c1222] hover:bg-cyan-900/40 text-cyan-300 border border-white/10 text-[11px] font-mono flex items-center space-x-1">
            <span>[[${l.label || l.targetId}]]</span>
          </button>
        `).join('');
      }
    }

    if (elBacklinks) {
      const backlinks = cell.backlinks || [];
      if (backlinks.length === 0) {
        elBacklinks.innerHTML = '<span class="text-gray-500 italic text-[11px]">No backlinks referencing this cell</span>';
      } else {
        elBacklinks.innerHTML = backlinks.map(b => `
          <button onclick="window.graphComp.jumpToNode('${b.id}')" class="px-2 py-0.5 rounded bg-[#0c1222] hover:bg-purple-900/40 text-purple-300 border border-white/10 text-[11px] font-mono flex items-center space-x-1">
            <span>${b.name}</span>
          </button>
        `).join('');
      }
    }

    if (elEditor) {
      elEditor.value = cell.content || '';
    }

    if (btnSave) {
      btnSave.onclick = async () => {
        try {
          btnSave.textContent = 'Saving...';
          await window.API.saveCell(cell.id, elEditor.value);
          btnSave.textContent = 'Saved!';
          setTimeout(() => btnSave.textContent = 'Save Cell', 1200);
          await this.loadGraph();
        } catch (e) {
          alert('Error saving cell: ' + e.message);
          btnSave.textContent = 'Save Cell';
        }
      };
    }
  }

  jumpToNode(nodeId) {
    const node = this.nodeMap.get(nodeId);
    if (!node) return;
    this.transform.x = this.width / 2 - node.x * this.transform.scale;
    this.transform.y = this.height / 2 - node.y * this.transform.scale;
    this.selectNode(node);
    this.hoveredNode = node;
  }

  closeInspector() {
    const inspector = document.getElementById('cell-inspector-panel');
    if (inspector) inspector.classList.add('hidden');
    this.selectedNode = null;
  }

  openNewCellModal() {
    const name = prompt('Enter Project or Memory Cell Name:');
    if (!name) return;
    const type = confirm('Is this a primary Project Cell? (Click Cancel for Memory Cell)') ? 'project' : 'memory';
    const tagsInput = prompt('Enter tags (comma separated, e.g. "ui, auth, api"):', '');
    const tags = (tagsInput || '').split(',').map(s => s.trim()).filter(Boolean);

    window.API.createCell({ name, type, tags }).then(res => {
      alert(`Cell "${name}" created!`);
      this.loadGraph();
      if (res.cell) this.selectNode(res.cell);
    }).catch(err => {
      alert('Creation failed: ' + err.message);
    });
  }
}

window.GraphComponent = GraphComponent;
