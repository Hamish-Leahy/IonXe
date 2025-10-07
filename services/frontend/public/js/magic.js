// Magic sheet functionality
(function(){
  const canvas = document.getElementById('magic-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let scale = 1, offsetX = 0, offsetY = 0, panning = false, lastX = 0, lastY = 0;
  
  function draw() {
    ctx.save();
    ctx.clearRect(0,0,canvas.width, canvas.height);
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);
    // demo grid
    ctx.strokeStyle = '#223244'; ctx.lineWidth = 1/scale;
    for (let x=-1000; x<2000; x+=50) { ctx.beginPath(); ctx.moveTo(x,-1000); ctx.lineTo(x,2000); ctx.stroke(); }
    for (let y=-1000; y<2000; y+=50) { ctx.beginPath(); ctx.moveTo(-1000,y); ctx.lineTo(2000,y); ctx.stroke(); }
    ctx.restore();
  }
  
  draw();
  
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1.1 : 0.9;
    scale = Math.max(0.2, Math.min(5, scale * delta));
    draw();
  }, { passive: false });
  
  canvas.addEventListener('mousedown', (e) => { panning = true; lastX = e.clientX; lastY = e.clientY; });
  window.addEventListener('mouseup', ()=>{ panning = false; });
  window.addEventListener('mousemove', (e)=>{
    if (!panning) return;
    offsetX += (e.clientX - lastX);
    offsetY += (e.clientY - lastY);
    lastX = e.clientX; lastY = e.clientY; draw();
  });
})();
