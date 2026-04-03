// explore.js

// State
let allCreators = [];
let uniClusters = [];
let currentZoomUni = null;
let simulation;
let svg;
let nodeLayer;

// Constants
const width = window.innerWidth;
const height = window.innerHeight;

// Utility Setup
async function init() {
  document.getElementById('network-loader').style.display = 'flex';
  
  // 1. Fetch Real Data
  try {
    const res = await fetch('/api/creators');
    allCreators = await res.json();
  } catch (e) {
    console.error('Failed to load creators', e);
  }

  // 2. Hydrate with Mock Data if empty or small (to show off the India ecosystem)
  const baseUniversities = [
    { name: 'Chandigarh University', id: 'CU', lat: 30, lng: 76, logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/8/87/Chandigarh_University_Seal.svg/512px-Chandigarh_University_Seal.svg.png' },
    { name: 'Panjab University', id: 'PU', lat: 31, lng: 76, logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/9/9e/Panjab_University_logo.png/512px-Panjab_University_logo.png' },
    { name: 'Delhi University', id: 'DU', lat: 28, lng: 77, logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/8/84/University_of_Delhi_coat_of_arms.svg/512px-University_of_Delhi_coat_of_arms.svg.png' },
    { name: 'IIT Bombay', id: 'IIT-B', lat: 19, lng: 72, logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/6/69/IIT_Bombay_logo.svg/512px-IIT_Bombay_logo.svg.png' },
    { name: 'LPU Jalandhar', id: 'LPU', lat: 31.2, lng: 75.7, logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/6/6e/Lovely_Professional_University_logo.png/512px-Lovely_Professional_University_logo.png' },
    { name: 'VIT Vellore', id: 'VIT', lat: 12.9, lng: 79.1 }
  ];

  // Group by University
  const uniMap = new Map();
  baseUniversities.forEach(u => uniMap.set(u.id, { ...u, creators: [], type: 'university' }));
  
  allCreators.forEach(c => {
    let uId = 'CU';
    if(c.university) {
      if(c.university.includes('Chandigarh')) uId = 'CU';
      else if(c.university.includes('Panjab') || c.university === 'PUC') uId = 'PU';
      else if(c.university.includes('Delhi')) uId = 'DU';
      else if(c.university.includes('Bombay')) uId = 'IIT-B';
      else uId = c.university.substring(0,3).toUpperCase();
    }
    if(!uniMap.has(uId)) {
      uniMap.set(uId, { name: c.university || uId, id: uId, lat: 20 + Math.random()*15, lng: 70 + Math.random()*15, creators: [], type: 'university' });
    }
    uniMap.get(uId).creators.push(c);
  });

  // Inject fake creators if missing (so the universe feels alive immediately)
  const fakeNames = ['Arjun S', 'Neha K', 'Priya M', 'Rahul V', 'Amit T', 'Sneha R', 'Vikram D', 'Pooja L', 'Karan J', 'Ananya G'];
  const fakeBg = ['ff0033', 'e63950', 'cc2244', 'b31b35', 'ff2244', 'dd1133', '990022', 'cc3344', 'ff4455', 'aa1122'];
  baseUniversities.forEach(u => {
    const cluster = uniMap.get(u.id);
    if(cluster.creators.length < 6) {
      for(let i=0; i < 6 - cluster.creators.length; i++){
        const nm = fakeNames[Math.floor(Math.random()*fakeNames.length)];
        const bg = fakeBg[Math.floor(Math.random()*fakeBg.length)];
        cluster.creators.push({
          id: Math.random().toString(),
          name: nm,
          specialty: ['Video Editor', 'VFX', 'UI/UX Designer', 'Web Developer', 'Motion Graphics'][Math.floor(Math.random()*5)],
          portfolio: '[]',
          avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(nm)}&background=${bg}&color=fff&size=128`
        });
      }
    }
  });

  uniClusters = Array.from(uniMap.values());

  buildNetwork();
  
  setTimeout(() => {
    const loader = document.getElementById('network-loader');
    loader.style.opacity = '0';
    setTimeout(() => loader.style.visibility = 'hidden', 600);
  }, 1000);
}

function buildNetwork() {
  const container = d3.select('#universe-container');
  svg = d3.select('#universe-links');
  nodeLayer = d3.select('#universe-nodes');

  // Define graph data
  const nodes = uniClusters.map(c => ({...c}));
  const links = [];
  
  // Make some random links representing active cross-campus matching
  for(let i=0; i<nodes.length; i++) {
    for(let j=i+1; j<nodes.length; j++) {
      if(Math.random() > 0.6) {
        links.push({ source: nodes[i].id, target: nodes[j].id, type: 'uni-link' });
      }
    }
  }

  // Map for Quick Access
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const graphLinks = links.map(l => ({ source: nodeMap.get(l.source), target: nodeMap.get(l.target), type: l.type }));

  // The Physics Simulation: Level 1 (India View)
  simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(graphLinks).distance(300))
    .force("charge", d3.forceManyBody().strength(-2000))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collide", d3.forceCollide().radius(120).iterations(2))
    .on("tick", ticked);

  // Draw Lines
  const linkElements = svg.selectAll(".link-line")
    .data(graphLinks)
    .enter().append("line")
    .attr("class", d => "link-line " + d.type);

  // Draw Nodes (HTML divs)
  const nodeElements = nodeLayer.selectAll(".uni-node")
    .data(nodes)
    .enter().append("div")
    .attr("class", "uni-node")
    .attr("id", d => 'node-' + d.id)
    .html(d => {
      const visual = d.logo 
        ? `<img src="${d.logo}" alt="${d.id}" style="width:64px; height:64px; object-fit:contain; margin-bottom:4px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));" />`
        : `<div class="uni-name">${d.id}</div>`;
      return `
        <div class="uni-pulse"></div>
        <div class="uni-pulse-2"></div>
        ${visual}
        <div class="uni-count">${d.creators.length} Creators</div>
      `
    })
    .call(d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended))
    .on("click", (event, d) => zoomToUniversity(d));

  function ticked() {
    linkElements
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);

    nodeElements
      .style("transform", d => `translate(${d.x}px, ${d.y}px)`);
  }

  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x; d.fy = d.y;
  }
  function dragged(event, d) {
    d.fx = event.x; d.fy = event.y;
  }
  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null; d.fy = null;
  }
  
  // Zoom behavior attached to container
  const zoom = d3.zoom()
    .scaleExtent([0.5, 3])
    .on("zoom", (e) => {
      nodeLayer.style("transform", `translate(${e.transform.x}px, ${e.transform.y}px) scale(${e.transform.k})`);
      nodeLayer.style("transform-origin", "0 0");
      svg.style("transform", `translate(${e.transform.x}px, ${e.transform.y}px) scale(${e.transform.k})`);
      svg.style("transform-origin", "0 0");
    });
  
  container.call(zoom);
  
  // Central zoom identity programmatically
  window.triggerZoom = (x, y, scale) => {
    container.transition().duration(1000).call(
      zoom.transform, 
      d3.zoomIdentity.translate(width/2 - x*scale, height/2 - y*scale).scale(scale)
    );
  };
}

let activeCreatorNodes = [];

function zoomToUniversity(uniNodeData) {
  if (currentZoomUni) return; // Already zooming or zoomed
  currentZoomUni = uniNodeData;
  
  // Hide other universities slightly to focus on the target
  d3.selectAll('.uni-node').classed('fade-out', d => d.id !== uniNodeData.id);
  
  // Cinematic Apple Maps style zoom
  window.triggerZoom(uniNodeData.x, uniNodeData.y, 2.5);
  document.getElementById('zoom-out-btn').classList.add('visible');
  
  // Level 2 (University View): Orbiting Creator Nodes
  const creators = uniNodeData.creators;
  const cx = uniNodeData.x;
  const cy = uniNodeData.y;
  const rBase = 100; // orbit radius
  
  creators.forEach((c, i) => {
    // Distribute around circumference
    const angle = (i / creators.length) * Math.PI * 2;
    const offsetR = rBase + (i % 2 === 0 ? 0 : 30) + (Math.random() * 20); // slightly staggered rings
    const finalX = cx + Math.cos(angle) * offsetR;
    const finalY = cy + Math.sin(angle) * offsetR;
    
    // Draw connecting SVG ray out from center BEFORE node visually scales in
    const linkLine = svg.append("line")
      .attr("class", "link-line active temp-line")
      .attr("x1", cx).attr("y1", cy)
      .attr("x2", cx).attr("y2", cy)
      .style("opacity", 0);
      
    // Animate ray expanding outward
    linkLine.transition().duration(800).delay(i * 100)
      .attr("x2", finalX).attr("y2", finalY)
      .style("opacity", 1);
      
    // Spawn DOM UI node
    const avatarSrc = c.avatar || c.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent((c.name||'U').substring(0,2))}&background=ff0033&color=fff&size=128`;
    
    const dNode = nodeLayer.append("div")
      .attr("class", "creator-node temp-creator")
      .style("transform", `translate(${cx}px, ${cy}px) scale(0.1)`)
      .html(`
        <img src="${avatarSrc}" alt="${c.name || 'Creator'}" 
          style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;"
          onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent((c.name||'U').substring(0,2))}&background=ff0033&color=fff&size=128'">
        <div class="creator-tag">${c.specialty?.split(' ')[0] || 'Editor'}</div>
      `)
      .on("click", (event) => {
        event.stopPropagation();
        openCreatorModal(c, uniNodeData);
      });
      
    // Float/morph outwards
    setTimeout(() => {
      dNode.style("transform", `translate(${finalX}px, ${finalY}px) scale(1)`);
      dNode.classed("active", true);
    }, i * 100 + 100);
    
    // Tiny custom jitter orbit loop for living network feel
    let t = 0;
    const jitter = setInterval(() => {
      if(!dNode.node()) return clearInterval(jitter); 
      t += 0.05;
      const jx = finalX + Math.sin(t + i*2) * 10;
      const jy = finalY + Math.cos(t + i*2) * 10;
      if (!dNode.classed("hovered")) {
        dNode.style("transform", `translate(${jx}px, ${jy}px) scale(1)`);
        linkLine.attr("x2", jx).attr("y2", jy);
      }
    }, 50);
    
    // Hover event overrides physics transform via CSS important rules
    dNode.on("mouseenter", function() { d3.select(this).classed("hovered", true); });
    dNode.on("mouseleave", function() { d3.select(this).classed("hovered", false); });
    
    activeCreatorNodes.push({ dNode, linkLine, jitter });
  });
}

function zoomOut() {
  if(!currentZoomUni) return;
  
  // Cleanup temp creators by morphing them back to center
  const cx = currentZoomUni.x;
  const cy = currentZoomUni.y;
  
  activeCreatorNodes.forEach(item => {
    clearInterval(item.jitter);
    item.dNode.classed('active', false);
    item.dNode.style("transform", `translate(${cx}px, ${cy}px) scale(0)`);
    item.linkLine.transition().duration(400).attr("x2", cx).attr("y2", cy).style("opacity", 0);
    
    setTimeout(() => {
      item.dNode.remove();
      item.linkLine.remove();
    }, 500);
  });
  activeCreatorNodes = [];
  
  // Reset Zoom
  window.triggerZoom(width/2, height/2, 1);
  d3.selectAll('.uni-node').classed('fade-out', false);
  document.getElementById('zoom-out-btn').classList.remove('visible');
  
  currentZoomUni = null;
}

document.getElementById('zoom-out-btn').addEventListener('click', zoomOut);



// Modal Logic
function openCreatorModal(creator, uniData) {
  const modal = document.getElementById('creator-modal');
  document.getElementById('modal-name').innerText = creator.name;
  document.getElementById('modal-uni').innerText = uniData.name;
  
  const avatar = creator.avatar || creator.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(creator.name.substring(0,2))}&background=ff007f&color=fff`;
  document.getElementById('modal-avatar').style.backgroundImage = `url('${avatar}')`;
  
  const tagsContainer = document.getElementById('modal-tags');
  tagsContainer.innerHTML = '';
  if(creator.specialty) {
    const tag = document.createElement('div');
    tag.className = 'modal-tag';
    tag.innerText = creator.specialty;
    tagsContainer.appendChild(tag);
  }
  const eTag = document.createElement('div');
  eTag.className = 'modal-tag';
  eTag.innerText = 'Top Rated';
  tagsContainer.appendChild(eTag);
  
  document.getElementById('modal-rating').innerText = (4.5 + Math.random()*0.5).toFixed(1);
  document.getElementById('modal-gigs').innerText = Math.floor(Math.random()*40 + 5);
  
  modal.classList.add('active');
}

document.getElementById('modal-close').addEventListener('click', () => {
  document.getElementById('creator-modal').classList.remove('active');
});

// Boot
init();
