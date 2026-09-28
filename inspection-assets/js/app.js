const embeddedPhotos={"capture-1.png": "images/capture-1.png", "capture-2.png": "images/capture-2.png", "capture-3.png": "images/capture-3.png"};
import * as THREE from '../vendor/three.module.js';

const $=s=>document.querySelector(s);
const data=[
 {id:1,target:'P-017',location:'主体施工区 · 1#楼东侧',short:'1#楼东侧',grid:'B-03',x:-16,z:-15,photo:'capture-1.png',confidence:'98.6%',box:[46.7,43,5.2,15.7],at:0},
 {id:2,target:'P-026',location:'钢筋加工区 · 2号加工棚',short:'钢筋加工区',grid:'D-02',x:37,z:-16,photo:'capture-2.png',confidence:'97.8%',box:[45.8,37.2,6,18.8],at:15},
 {id:3,target:'P-032',location:'基坑作业区 · 南侧通道',short:'基坑南侧',grid:'C-05',x:7,z:27,photo:'capture-3.png',confidence:'99.1%',box:[44.7,40.2,6,14.5],at:34}
];
let elapsed=0,playing=true,selected=1,frames=126,merged=0,records=[],viewScale=1,drag=null,toastTimer;
const baseDate=new Date();baseDate.setHours(9,42,18,0);
const timeFor=seconds=>new Date(baseDate.getTime()+seconds*1000).toLocaleTimeString('zh-CN',{hour12:false});
const dateText=baseDate.getFullYear()+'-'+String(baseDate.getMonth()+1).padStart(2,'0')+'-'+String(baseDate.getDate()).padStart(2,'0');
const host=$('#scene'), scene=new THREE.Scene();scene.background=new THREE.Color('#ecf3f6');
let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});}catch(e){$('#scene-loading').textContent='三维场景需要浏览器开启硬件加速';throw e;}
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;host.prepend(renderer.domElement);renderer.domElement.setAttribute('aria-label','俯视三维工地，无人机巡检与未戴安全帽工人位置');renderer.domElement.setAttribute('role','img');
const camera=new THREE.OrthographicCamera(-100,100,75,-75,.1,700);const center=new THREE.Vector3(0,0,0);
const ambient=new THREE.HemisphereLight(0xffffff,0xb4c9d4,1.65);scene.add(ambient);const sun=new THREE.DirectionalLight(0xffffff,2.3);sun.position.set(-65,130,40);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-110;sun.shadow.camera.right=110;sun.shadow.camera.top=110;sun.shadow.camera.bottom=-110;sun.shadow.normalBias=.3;scene.add(sun);
const materials=new Map();function mat(color){if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.87}));return materials.get(color);}
function box(w,h,d,x,y,z,color,parent=scene){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function cylinder(r,h,x,y,z,color,parent=scene){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,16),mat(color));m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;}
function beam(a,b,r,color,parent=scene){const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,from.distanceTo(to),7),mat(color));m.position.copy(from.clone().add(to).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),to.sub(from).normalize());m.castShadow=true;parent.add(m);return m;}
function line(points,color,dashed=false,parent=scene){const g=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p)));const m=dashed?new THREE.LineDashedMaterial({color,dashSize:2,gapSize:1.3}):new THREE.LineBasicMaterial({color});const l=new THREE.Line(g,m);if(dashed)l.computeLineDistances();parent.add(l);return l;}
const overlays=[];
function label(text,x,y,z,type='map-label',click){const el=document.createElement(click?'button':'span');el.className=type;el.textContent=text;$('#labels').append(el);if(click)el.onclick=click;const item={el,pos:new THREE.Vector3(x,y,z)};overlays.push(item);return item;}
// Survey-style site diagram. All local coordinates are illustrative, not surveyed BIM coordinates.
box(164,1.8,111,0,-1.4,0,'#c8d6dc');box(160,.5,107,0,-.35,0,'#e0e5e4');
const grid=new THREE.GridHelper(500,100,0xd4e2e8,0xdfebef);grid.position.y=-2.4;scene.add(grid);
box(154,.15,8,0,0,-45,'#b7c6ce');box(154,.15,9,0,0,43,'#b7c6ce');box(8,.15,96,-73,0,0,'#b7c6ce');box(8,.15,96,73,0,0,'#b7c6ce');box(7,.16,80,20,0,0,'#bfcbd1');box(145,.16,7,0,0,9,'#bfccd2');
for(let x=-65;x<73;x+=9){box(4,.04,.18,x,.12,43,'#edf5f6');box(4,.04,.18,x,.12,-45,'#edf5f6');}for(let z=-39;z<44;z+=9){box(.18,.04,4,-73,.12,z,'#edf5f6');box(.18,.04,4,73,.12,z,'#edf5f6');}
for(let x=-78;x<=78;x+=4){box(3.85,1.5,.2,x,.8,-53,'#94b3be');if(x<45||x>61)box(3.85,1.5,.2,x,.8,53,'#94b3be');}for(let z=-51;z<=51;z+=4){box(.2,1.5,3.85,-80,.8,z,'#94b3be');box(.2,1.5,3.85,80,.8,z,'#94b3be');}
function building(x,z,w,d,floors,complete=false){box(w+2,.5,d+2,x,.25,z,'#c4d2d6');for(let f=0;f<floors;f++){const y=.5+f*3.2;box(w,.38,d,x,y,z,'#eff3f3');for(let a=-w/2+1;a<w/2;a+=4){for(let b=-d/2+1;b<d/2;b+=4){box(.55,3,.55,x+a,y+1.5,z+b,'#bbcbd0');}}if(complete){for(let a=-w/2+1.5;a<w/2;a+=3.2){box(1.9,2,.15,x+a,y+1.4,z+d/2,'#a7c4cf');box(1.9,2,.15,x+a,y+1.4,z-d/2,'#a7c4cf');}for(let b=-d/2+1.5;b<d/2;b+=3.2){box(.15,2,1.9,x+w/2,y+1.4,z+b,'#a7c4cf');box(.15,2,1.9,x-w/2,y+1.4,z+b,'#a7c4cf');}}}const top=.5+floors*3.2;box(w,.5,d,x,top,z,'#eef3f3');for(let a=-w/2+1;a<w/2;a+=3){for(let b=-d/2+1;b<d/2;b+=3){box(.11,1.3,.11,x+a,top+.85,z+b,'#8f9e9f');}}box(w,.65,.3,x,top+.4,z-d/2,'#d5e0e2');box(.3,.65,d,x-w/2,top+.4,z,'#d5e0e2');label(complete?'2#楼':'1#楼',x,top+3,z);}
building(-40,-22,30,22,5);building(-1,-25,23,20,3,true);
// Excavation and reinforcement beds.
box(40,.35,23,-12,.1,25,'#a8b8bb');box(36,.4,19,-12,.25,25,'#c6ccbf');box(40,2.4,.65,-12,1.2,13.5,'#c2ced0');box(40,2.4,.65,-12,1.2,36.5,'#c2ced0');box(.65,2.4,23,-32,1.2,25,'#c2ced0');box(.65,2.4,23,8,1.2,25,'#c2ced0');for(let x=-29;x<8;x+=5){box(.3,.3,22,x,2.1,25,'#abbfc4');for(let z=17;z<=33;z+=5)cylinder(.7,.6,x,.7,z,'#9daeb0');}for(let z=15;z<37;z+=3)box(39,.22,.15,-12,2.3,z,'#b4c4c5');label('基坑作业区',-13,2,34);
// Steel processing sheds and material stacks.
function shed(x,z,w,d){for(const dx of [-w/2,w/2])for(const dz of [-d/2,d/2])box(.45,4,.45,x+dx,2,z+dz,'#94a7ad');box(w+1,.3,d+1,x,4,z,'#70a8bb');for(let a=-w/2;a<w/2;a+=2)box(.1,.1,d+1,x+a,4.2,z,'#94bac8');}
shed(46,-29,28,12);shed(46,-4,28,11);for(let j=0;j<3;j++)for(let i=0;i<7;i++)box(12,.4,.42,40,.45+j*.4,-29+i*.65,'#8f9d9f');for(let j=0;j<3;j++)for(let i=0;i<8;i++)box(10,.35,.45,49,.4+j*.4,-5+i*.6,'#98a6a9');label('钢筋加工区',51,5,-11);
box(32,.3,23,47,.05,25,'#d6dddb');for(let j=0;j<3;j++)for(let i=0;i<4;i++)box(4,1.5,2.4,36+i*6,.8,19+j*5,'#b8c1b9');label('材料堆场',49,2,35);
// Site offices.
for(let i=0;i<3;i++){box(9,3.5,9,-58+i*12,1.75,25,'#edf2f1');box(10,.35,10,-58+i*12,3.7,25,'#97b9c4');box(2.1,2.2,.12,-58+i*12,1.2,29.55,'#809ba8');for(let a=0;a<2;a++)box(2,1,.13,-61+i*12+a*5,2,29.6,'#a0c5d0');}label('项目部',-46,5,30);
const cranes=[];
function crane(x,z,angle){let group=new THREE.Group();group.position.set(x,0,z);group.rotation.y=angle;scene.add(group);for(let i=0;i<4;i++){const dx=(i%2)*1.6-.8,dz=Math.floor(i/2)*1.6-.8;box(.18,29,.18,dx,14.5,dz,'#e6b363',group);}for(let y=0;y<29;y+=2){for(const a of [-.8,.8]){beam([-.8,y,a],[.8,y+2,a],.08,'#d9ab64',group);beam([a,y,-.8],[a,y+2,.8],.08,'#d9ab64',group);}}const mast=group;group=new THREE.Group();group.position.set(x,0,z);group.rotation.y=angle;scene.add(group);cranes.push(group);box(33,.4,1.5,8,29,0,'#e6b363',group);for(let x=-8;x<24;x+=2)beam([x,29,-.65],[x+2,30.6,.65],.1,'#e6b363',group);box(33,.18,1.3,8,30.5,0,'#edc081',group);box(3,1.7,2,-6,28.5,0,'#a5b5bd',group);beam([0,29,0],[0,34,0],.12,'#e6b363',group);beam([0,34,0],[23,30.5,0],.055,'#95a1a3',group);beam([0,34,0],[-8,30.5,0],.055,'#95a1a3',group);beam([17,29,0],[17,12,0],.055,'#8c9b9f',group);}
crane(-56,-2,-.1);crane(13,-36,1.4);
// Small planted boundaries keep the worksite context legible.
for(let x=-65;x<70;x+=11){for(const z of [-50,49]){if(z===49&&x>38)continue;cylinder(.25,1.8,x,.7,z,'#95a6a0');const tree=new THREE.Mesh(new THREE.IcosahedronGeometry(1.9,1),mat('#9cbdad'));tree.position.set(x,2.6,z);tree.castShadow=true;scene.add(tree);}}
scene.updateMatrixWorld(true);const obstacleBounds=[];scene.traverse(object=>{if(object.isMesh&&object.castShadow)obstacleBounds.push(new THREE.Box3().setFromObject(object));});
// Launch pad and schematic DJI enterprise quadcopter.
const pad=new THREE.Mesh(new THREE.CircleGeometry(5,48),mat('#b6d7d6'));pad.rotation.x=-Math.PI/2;pad.position.set(-46,.12,38);scene.add(pad);const padRing=new THREE.Mesh(new THREE.RingGeometry(4.6,4.8,48),mat('#f5ffff'));padRing.rotation.x=-Math.PI/2;padRing.position.set(-46,.14,38);scene.add(padRing);box(.4,.03,4,-47.2,.15,38,'#f3ffff');box(.4,.03,4,-44.8,.15,38,'#f3ffff');box(2.4,.03,.4,-46,.15,38,'#f3ffff');label('H · 项目部起降点',-46,2,40);
const drone=new THREE.Group();drone.scale.setScalar(1.5);scene.add(drone);box(1.7,.7,2.4,0,0,0,'#455b66',drone);box(1.5,.25,1.6,0,.5,0,'#f3f6f6',drone);const rotors=[];for(const x of [-2.3,2.3])for(const z of [-2,2]){beam([0,0,0],[x,.1,z],.18,'#5a6c75',drone);cylinder(.3,.4,x,.35,z,'#384e59',drone);const rotor=new THREE.Group();rotor.position.set(x,.6,z);drone.add(rotor);box(2.6,.05,.18,0,0,0,'#667982',rotor);const blur=new THREE.Mesh(new THREE.CircleGeometry(1.3,24),new THREE.MeshBasicMaterial({color:'#7e949f',transparent:true,opacity:.13,side:THREE.DoubleSide}));blur.rotation.x=-Math.PI/2;rotor.add(blur);rotors.push(rotor);}box(.7,.7,.7,0,-.6,-.8,'#2a4857',drone);cylinder(.24,.4,0,-1.1,-.8,'#142d38',drone);for(const x of [-.8,.8]){beam([x,0,0],[x,-1.1,0],.08,'#4b5f69',drone);beam([x,-1.1,-1],[x,-1.1,1],.08,'#4b5f69',drone);}
// Boustrophedon coverage, connected as one return-to-home mission.
const flightPoints=[[-46,38]],routeZones=['项目部起飞'];
function addPoint(p,zone){const a=flightPoints.at(-1);if(Math.hypot(a[0]-p[0],a[1]-p[1])>.01){flightPoints.push(p);routeZones.push(zone);}}
function sweep(x0,x1,z0,z1,name){let row=0;for(let z=z0;z<=z1+.01;z+=5){addPoint([row%2?x1:x0,z],name);addPoint([row%2?x0:x1,z],name);row++;}}
addPoint([-68,38],'项目部起飞');addPoint([-68,-13],'前往1#楼');
function lanes(x0,x1,zs,name){zs.forEach((z,i)=>{addPoint([i%2?x1:x0,z],name);addPoint([i%2?x0:x1,z],name);});}
lanes(-53,-27,[-13,-18,-23,-28,-33],'1#楼 · 弓字巡检');
for(const p of [[-11,-33],[1,-33],[1,-28],[-11,-28],[-11,-23],[9,-23],[9,-18],[-11,-18]])addPoint(p,'2#楼 · 弓字巡检');
for(const p of [[-11,-8],[24,-8],[24,-34]])addPoint(p,'加工区 · 绕塔通道');
lanes(33,59,[-34,-29,-24],'1号加工棚 · 弓字巡检');
addPoint([65,-24],'加工区连接');addPoint([65,-9],'加工区连接');
lanes(59,33,[-9,-4,1],'2号加工棚 · 弓字巡检');
lanes(32,62,[16,21,26,31],'材料堆场 · 弓字巡检');
lanes(7,-29,[31,27,23,19,15],'基坑 · 弓字巡检');
addPoint([-37,15],'返航 · 项目部');addPoint([-37,38],'返航 · 项目部');addPoint([-46,38],'返航 · 项目部');
function mastDistance(a,b,c){const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((c[0]-a[0])*dx+(c[1]-a[1])*dz)/(dx*dx+dz*dz||1)));return Math.hypot(a[0]+t*dx-c[0],a[1]+t*dz-c[1]);}
const masts=[[-56,-2],[13,-36]];
const route=line(flightPoints.map(([x,z])=>[x,.3,z]),'#19aeb0',true);route.visible=false;
const droneLabel=label('DJI · 巡检中',0,0,0,'map-label drone-label');
const scan=new THREE.Mesh(new THREE.ConeGeometry(7,19,4,1,true),new THREE.MeshBasicMaterial({color:'#18b8bf',transparent:true,opacity:.055,side:THREE.DoubleSide,depthWrite:false}));scene.add(scan);const scanRing=new THREE.Mesh(new THREE.RingGeometry(5.7,6,64),new THREE.MeshBasicMaterial({color:'#17b5bc',transparent:true,opacity:.5,side:THREE.DoubleSide}));scanRing.rotation.x=-Math.PI/2;scene.add(scanRing);
function person(x,z,color){const g=new THREE.Group();g.position.set(x,.4,z);scene.add(g);cylinder(.48,1.1,0,1.45,0,color,g);const head=new THREE.Mesh(new THREE.SphereGeometry(.4,12,12),mat('#524c45'));head.position.y=2.35;g.add(head);beam([-.26,1,0],[-.3,.1,.05],.16,'#3e5663',g);beam([.26,1,0],[.35,.1,-.1],.16,'#3e5663',g);beam([-.4,1.8,0],[-.7,1,.1],.15,color,g);beam([.4,1.8,0],[.65,1,-.1],.15,color,g);return g;}
const eventObjects=new Map();data.forEach(d=>{const worker=person(d.x,d.z,'#eb6351');worker.visible=false;const ring=new THREE.Mesh(new THREE.RingGeometry(1.7,2,48),new THREE.MeshBasicMaterial({color:'#ed6556',transparent:true,opacity:.8,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.set(d.x,.26,d.z);scene.add(ring);ring.visible=false;const tag=label('⚠ '+String(d.id).padStart(2,'0')+' 未戴帽',d.x,5.5,d.z,'map-label alert hidden',()=>select(d.id,true));eventObjects.set(d.id,{worker,ring,tag});});
for(const [x,z] of [[-22,-4],[32,3],[60,-18],[-40,5],[5,5],[31,35]]){const p=person(x,z,'#b4bfc0');const helmet=new THREE.Mesh(new THREE.SphereGeometry(.43,12,12),mat('#efc572'));helmet.position.y=2.5;p.add(helmet);}
// Flight and camera controls for the local inspection demonstration.
let viewMode='follow',orbitYaw=.4,orbitPitch=.83,flightSpeed=5,safetyMargin=3,requestedAltitude=45,flightAltitude=45;
let phase='takeoff',verticalProgress=0,actualAltitude=2.1;
let travelled=0,legIndex=0,lastCaptureSecond=-1,prevSecond=-1,envelopeVisible=true;
const simulationRate=2,droneRadius=6;
const lengths=flightPoints.slice(1).map((p,i)=>Math.hypot(p[0]-flightPoints[i][0],p[1]-flightPoints[i][1]));
const routeLength=lengths.reduce((a,b)=>a+b,0);
const safetyEnvelope=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),new THREE.MeshBasicMaterial({color:'#2864e8',wireframe:true,transparent:true,opacity:.17,depthWrite:false}));
scene.add(safetyEnvelope);
const airborneRoute=new THREE.Group();scene.add(airborneRoute);
function drawPlannedRoute(){airborneRoute.children.slice().forEach(c=>{airborneRoute.remove(c);c.geometry.dispose();c.material.dispose();});for(let i=1;i<flightPoints.length;i++){const a=flightPoints[i-1],b=flightPoints[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);for(let d=0;d<length;d+=3.4){const end=Math.min(d+2.5,length),p=t=>new THREE.Vector3(THREE.MathUtils.lerp(a[0],b[0],t/length),flightAltitude,THREE.MathUtils.lerp(a[1],b[1],t/length));const from=p(d),to=p(end);const mesh=new THREE.Mesh(new THREE.CylinderGeometry(.19,.19,from.distanceTo(to),6),new THREE.MeshBasicMaterial({color:'#4289be',transparent:true,opacity:.8}));mesh.position.copy(from.clone().add(to).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),to.sub(from).normalize());airborneRoute.add(mesh);}}}

const trajectory=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:'#12a58a'}));scene.add(trajectory);
function clearanceAt(p){let minimum=Infinity;for(const bounds of obstacleBounds)minimum=Math.min(minimum,bounds.distanceToPoint(p)-droneRadius);return Math.max(0,minimum);}
function routeMinimum(height){let result=Infinity;const p=new THREE.Vector3();for(let i=0;i<lengths.length;i++){const steps=Math.ceil(lengths[i]);for(let j=0;j<=steps;j++){const t=j/steps;p.set(THREE.MathUtils.lerp(flightPoints[i][0],flightPoints[i+1][0],t),height,THREE.MathUtils.lerp(flightPoints[i][1],flightPoints[i+1][1],t));result=Math.min(result,clearanceAt(p));}}return result;}
function planFlight(notify=false){
 safetyMargin=Number($('#margin-control').value);requestedAltitude=Number($('#altitude-control').value);flightSpeed=Number($('#speed-control').value);
 // Conservative vertical separation from every static object, including crane tips.
 const highest=obstacleBounds.reduce((m,b)=>Math.max(m,b.max.y),0);
 flightAltitude=Math.max(requestedAltitude,Math.ceil(highest+droneRadius+safetyMargin));
 safetyEnvelope.scale.setScalar(safetyMargin+droneRadius);
 drawPlannedRoute();
 $('#margin-value').textContent=safetyMargin;$('#speed-value').textContent=flightSpeed.toFixed(1);$('#altitude-value').textContent=requestedAltitude;
 $('#actual-height').innerHTML=flightAltitude+' <small>m</small>';$('#speed').innerHTML=(playing?flightSpeed:0).toFixed(1)+' <small>m/s</small>';
 $('#route-length').textContent=Math.round(routeLength)+' m';$('#flight-duration').textContent=(routeLength/flightSpeed/60).toFixed(1)+' min';
 $('#min-clearance').textContent=routeMinimum(flightAltitude).toFixed(1)+' m';
 $('#plan-note').textContent=flightAltitude>requestedAltitude?'避让旋转塔臂，航高提升至 '+flightAltitude+' m':'弓字巡检 · 绕塔杆 / 高于塔臂 · 闭环返航';
 if(notify)flash('航线已更新 · 航高 '+flightAltitude+' m');
 updateDrone();updateCamera();
}
function sampleFlight(distance){if(distance>=routeLength){const p=flightPoints.at(-1);return {x:p[0],z:p[1],index:lengths.length-1,heading:0};}let remaining=Math.max(0,Math.min(distance,routeLength));let index=0;while(index<lengths.length-1&&remaining>lengths[index]){remaining-=lengths[index++];}const a=flightPoints[index],b=flightPoints[index+1],t=Math.min(1,remaining/lengths[index]);return {x:THREE.MathUtils.lerp(a[0],b[0],t),z:THREE.MathUtils.lerp(a[1],b[1],t),index,heading:Math.atan2(b[0]-a[0],b[1]-a[1])};}
function updateDrone(){const p=sampleFlight(travelled);legIndex=p.index;drone.position.set(p.x,actualAltitude,p.z);drone.rotation.y=p.heading;safetyEnvelope.position.copy(drone.position);scan.visible=phase==='cruise';scanRing.visible=phase==='cruise';scan.scale.y=actualAltitude/19;scan.position.set(p.x,actualAltitude/2,p.z);scanRing.position.set(p.x,.28,p.z);droneLabel.pos.set(p.x,actualAltitude+5,p.z);$('#actual-height').innerHTML=actualAltitude.toFixed(1)+' <small>m</small>';return p;}
function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h);const aspect=w/h;const span=viewMode==='follow'?Math.max(43,48/aspect):Math.max(78,108/aspect);camera.left=-span*aspect/viewScale;camera.right=span*aspect/viewScale;camera.top=span/viewScale;camera.bottom=-span/viewScale;camera.updateProjectionMatrix();updateCamera();}
function updateCamera(){
 if(viewMode==='top'){camera.up.set(0,0,-1);camera.position.copy(center).add(new THREE.Vector3(0,190,0));camera.lookAt(center);}
 else if(viewMode==='follow'){camera.up.set(0,1,0);const focus=drone.position.clone().add(new THREE.Vector3(0,-9,0));camera.position.copy(drone.position).add(new THREE.Vector3(38,52,60));camera.lookAt(focus);}
 else{camera.up.set(0,1,0);const radius=190;camera.position.copy(center).add(new THREE.Vector3(Math.sin(orbitYaw)*Math.cos(orbitPitch)*radius,Math.sin(orbitPitch)*radius,Math.cos(orbitYaw)*Math.cos(orbitPitch)*radius));camera.lookAt(center);}
 camera.updateMatrixWorld();
}
function setView(mode){if(!['perspective','top','follow'].includes(mode))return;viewMode=mode;viewScale=mode==='follow'?1.3:1;center.set(0,0,0);document.querySelectorAll('[data-view]').forEach(b=>{const active=b.dataset.view===mode;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});$('.view-chip').textContent={perspective:'◇ 三维视角',top:'◈ 俯视视角',follow:'✣ 跟随无人机'}[mode];$('.scene-help').textContent=mode==='perspective'?'拖动旋转 · 右键平移 · 滚轮缩放':mode==='top'?'拖动平移 · 滚轮缩放':'相机跟随无人机 · 滚轮缩放';resize();}
function flash(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),2400);}
function updateRecords(){const markup=records.map(r=>{const d=data.find(e=>e.id===r.id);return `<button class="record ${selected===d.id?'selected':''}" data-event="${d.id}" aria-label="查看${d.short}异常记录" aria-pressed="${selected===d.id}"><img loading="lazy" decoding="async" src="${embeddedPhotos[d.photo]}" alt="${d.short}巡检照片"><span class="record-info"><strong>${d.short}</strong><small>${timeFor(r.first)} · ${d.grid} · 未戴帽</small></span><span class="record-id">#00${d.id}</span><span class="record-arrow">›</span></button>`}).join('');$('#records').innerHTML=markup;$('#records').querySelectorAll('button').forEach(b=>b.onclick=()=>select(Number(b.dataset.event),true));$('#event-count').textContent=records.length;$('#photo-count').textContent=records.length;$('#pending-count').textContent=records.length+' 条待核查';$('#record-number').textContent=String(records.length).padStart(2,'0');}
function select(id,focus=false){const r=records.find(r=>r.id===id);if(!r)return;selected=id;const d=data.find(d=>d.id===id);$('#capture-image').src=embeddedPhotos[d.photo];$('#capture-image').alt='无人机远距离俯拍：'+d.location+'中国工人未戴安全帽';$('#event-id').textContent='#'+String(id).padStart(3,'0');$('#location').textContent=d.location;$('#coords').textContent='网格 '+d.grid+' · 地面作业层';$('#target-id').textContent=d.target;$('#confidence').textContent=d.confidence;$('#photo-time').textContent=timeFor(r.first);$('#captured-at').textContent=dateText+' '+timeFor(r.first);const b=$('.detection-box');['left','top','width','height'].forEach((k,i)=>b.style[k]=d.box[i]+'%');eventObjects.forEach((obj,k)=>obj.tag.el.classList.toggle('selected',k===id));updateRecords();if(focus){if(viewMode==='follow')setView('perspective');center.set(d.x,0,d.z);viewScale=1.45;resize();flash('已定位 · '+d.location);}}
function capture(d){const existing=records.find(r=>r.id===d.id);if(existing){existing.last=Math.round(elapsed);merged++;return;}records.unshift({id:d.id,first:Math.round(elapsed),last:Math.round(elapsed)});const obj=eventObjects.get(d.id);obj.worker.visible=true;obj.ring.visible=true;obj.tag.el.classList.remove('hidden');select(d.id);if(elapsed>1)flash('发现未戴帽工人 · '+d.short);}
function pause(){if(phase==='complete'){resetMission();return;}playing=!playing;$('#pause').textContent=playing?'Ⅱ 暂停巡检':'▶ 继续巡检';$('#status').textContent=playing?'正在巡检':'巡检已暂停';$('#speed').innerHTML=(playing?flightSpeed:0).toFixed(1)+' <small>m/s</small>';droneLabel.el.textContent=playing?'DJI · 巡检中':'DJI · 已暂停';}
function resetMission(){phase='takeoff';verticalProgress=0;actualAltitude=2.1;elapsed=0;travelled=0;records=[];frames=126;merged=0;prevSecond=-1;lastCaptureSecond=-1;eventObjects.forEach(o=>{o.worker.visible=false;o.ring.visible=false;o.tag.el.classList.add('hidden');});if(!playing)pause();capture(data[0]);center.set(0,0,0);viewScale=viewMode==='follow'?1.3:1;updateDrone();resize();updateCounters();flash('巡检已重新开始');}
function updateCounters(){frames=126+Math.floor(elapsed*4);$('#frames').textContent=frames.toLocaleString();const pct=Math.min(100,Math.floor(travelled/routeLength*100));$('#progress-label').innerHTML=pct+'<small>%</small>';$('#progress-bar').style.width=pct+'%';const currentZone=routeZones[Math.min(legIndex+1,routeZones.length-1)];const zoneIndex=travelled===0?0:currentZone.includes('楼')?1:currentZone.includes('棚')?2:currentZone.includes('材料')?3:currentZone.includes('基坑')?4:5;$('#zone').textContent=routeZones[Math.min(legIndex+1,routeZones.length-1)];document.querySelectorAll('.stop').forEach((s,i)=>{s.classList.toggle('active',i===zoneIndex);s.classList.toggle('done',i<zoneIndex)});$('#filter-note').textContent=merged?'正常画面不存档 · 已合并 '+merged+' 次重复识别':'正常画面不存档 · 重复目标已合并';
 const p=sampleFlight(travelled);const points=flightPoints.slice(0,p.index+1).map(([x,z])=>new THREE.Vector3(x,flightAltitude+.1,z));points.push(new THREE.Vector3(p.x,flightAltitude+.1,p.z));trajectory.geometry.dispose();trajectory.geometry=new THREE.BufferGeometry().setFromPoints(points);
}
$('#pause').onclick=pause;$('#replay').onclick=resetMission;$('#locate').onclick=()=>select(selected,true);
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
for(const id of ['margin-control','speed-control','altitude-control']){$('#'+id).addEventListener('input',()=>planFlight(false));}
$('#replan-flight').onclick=()=>planFlight(true);
$('#toggle-envelope').onclick=()=>{envelopeVisible=!envelopeVisible;safetyEnvelope.visible=envelopeVisible;$('#toggle-envelope').classList.toggle('active',envelopeVisible);$('#toggle-envelope').setAttribute('aria-pressed',String(envelopeVisible));};
$('#zoom-in').onclick=()=>{viewScale=Math.min(2.4,viewScale+.2);resize();};$('#zoom-out').onclick=()=>{viewScale=Math.max(.6,viewScale-.2);resize();};
$('#reset-view').onclick=()=>{center.set(0,0,0);orbitYaw=.4;orbitPitch=.83;viewScale=viewMode==='follow'?1.3:1;resize();flash('已恢复当前视角');};
renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();viewScale=THREE.MathUtils.clamp(viewScale-e.deltaY*.0007,.6,2.4);resize();},{passive:false});
renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());
renderer.domElement.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,pan:e.button===2||e.shiftKey};renderer.domElement.setPointerCapture(e.pointerId);});
renderer.domElement.addEventListener('pointermove',e=>{if(!drag||viewMode==='follow')return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(viewMode==='perspective'&&!drag.pan){orbitYaw-=dx*.006;orbitPitch=THREE.MathUtils.clamp(orbitPitch+dy*.005,.28,1.45);}else{const sx=dx*.2/viewScale,sy=dy*.2/viewScale;center.x=THREE.MathUtils.clamp(center.x-sx,-85,85);center.z=THREE.MathUtils.clamp(center.z-sy,-65,65);}drag={...drag,x:e.clientX,y:e.clientY};updateCamera();});
renderer.domElement.addEventListener('pointerup',()=>drag=null);renderer.domElement.addEventListener('pointercancel',()=>drag=null);
$('#open-photo').onclick=()=>{const d=data.find(d=>d.id===selected),r=records.find(r=>r.id===selected);$('#large-photo').src=embeddedPhotos[d.photo];$('#dialog-title').textContent='#00'+d.id+' · '+d.location;$('#dialog-caption').textContent=dateText+' '+timeFor(r.first)+' · '+d.grid+' · 巡检演示照片';$('#photo-dialog').showModal();};$('#close-photo').onclick=()=>$('#photo-dialog').close();$('#photo-dialog').onclick=e=>{if(e.target===$('#photo-dialog'))$('#photo-dialog').close();};
planFlight();setView('follow');capture(data[0]);updateCounters();new ResizeObserver(resize).observe(host);$('#scene-loading').remove();
let last=performance.now();function animate(now){requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.1);last=now;if(playing){elapsed+=dt*simulationRate;
if(phase==='takeoff'||phase==='landing'){verticalProgress=Math.min(1,verticalProgress+dt/7);const t=verticalProgress*verticalProgress*(3-2*verticalProgress);actualAltitude=phase==='takeoff'?THREE.MathUtils.lerp(2.1,flightAltitude,t):THREE.MathUtils.lerp(flightAltitude,2.1,t);$('#status').textContent=phase==='takeoff'?'正在起飞':'返航降落';droneLabel.el.textContent=phase==='takeoff'?'DJI · 垂直起飞':'DJI · 垂直降落';$('#speed').innerHTML='—';if(verticalProgress>=1){if(phase==='takeoff'){phase='cruise';$('#status').textContent='正在巡检';droneLabel.el.textContent='DJI · 巡检中';}else{phase='complete';playing=false;$('#status').textContent='巡检完成 · 已降落';$('#pause').textContent='↻ 再次巡检';$('#speed').innerHTML='0.0 <small>m/s</small>';droneLabel.el.textContent='DJI · 已降落';}}}
else if(phase==='cruise'){actualAltitude=flightAltitude;travelled=Math.min(routeLength,travelled+dt*flightSpeed*simulationRate);$('#speed').innerHTML=flightSpeed.toFixed(1)+' <small>m/s</small>';if(travelled>=routeLength){phase='landing';verticalProgress=0;}}
}const p=updateDrone();const second=Math.floor(elapsed);if(second!==prevSecond){prevSecond=second;updateCounters();}if(playing&&phase==='cruise'&&second!==lastCaptureSecond){lastCaptureSecond=second;data.forEach(d=>{if(Math.hypot(d.x-p.x,d.z-p.z)<7)capture(d);});}cranes.forEach((c,i)=>c.rotation.y+=dt*(i?-.12:.1));rotors.forEach((r,i)=>{if(playing)r.rotation.y+=dt*44*(i%2?1:-1);});eventObjects.forEach(o=>{o.ring.scale.setScalar(1+Math.sin(now*.003)*.1);});updateCamera();
 if(!host.clientWidth||document.hidden)return;
 const w=host.clientWidth,h=host.clientHeight;overlays.forEach(o=>{const p=o.pos.clone().project(camera);o.el.style.left=((p.x+1)*w*.5)+'px';o.el.style.top=((-p.y+1)*h*.5)+'px';o.el.style.visibility=p.z>1||p.z< -1||Math.abs(p.x)>.97||Math.abs(p.y)>.95?'hidden':'visible';});renderer.render(scene,camera);
}
requestAnimationFrame(animate);

// Optional page tools share the same demo state as the visible controls.
if(document.modelContext?.registerTool){
 const lifecycle=new AbortController();
 for(const tool of [
  {name:'get_patrol_events',title:'读取巡检异常',description:'读取本次模拟巡检已记录的未戴安全帽事件。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute(){return {mode:'simulation',playing,events:records.map(r=>{const d=data.find(d=>d.id===r.id);return {id:r.id,location:d.location,grid:d.grid,time:dateText+' '+timeFor(r.first),target:d.target};})};}},
  {name:'locate_patrol_event',title:'定位异常工人',description:'选择已有模拟事件，在三维工地中定位并显示对应抓拍。',inputSchema:{type:'object',properties:{id:{type:'integer',minimum:1,maximum:3}},required:['id'],additionalProperties:false},annotations:{readOnlyHint:false},execute(input){if(!input||!Number.isInteger(input.id)||!records.some(r=>r.id===input.id))throw new Error('未找到已记录的事件');select(input.id,true);return {selectedEventId:selected,location:data.find(d=>d.id===selected).location};}}
 ]){try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}}
 window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}


(()=>{
const $=id=>document.getElementById(id),video=$('live-video'),start=$('camera-start'),stop=$('camera-stop'),flip=$('camera-flip'),status=$('camera-state'),hint=$('camera-hint');
let stream=null,facing='environment',generation=0;
function message(text,detail=''){status.textContent=text;hint.textContent=detail;}
function release(){if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;video.removeAttribute('src');video.load();stop.disabled=true;flip.disabled=true;$('live-empty').hidden=false;}
function close(){generation++;release();start.disabled=false;message('摄像头已关闭','画面仅在当前设备显示，不上传、不录制。');}
async function attach(next,label='外部视频流'){
 release();stream=next;video.srcObject=next;stop.disabled=false;start.disabled=false;flip.disabled=label!=='手机 / 本机摄像头';$('live-source').textContent=label;
 next.getVideoTracks().forEach(t=>t.addEventListener('ended',()=>{if(stream===next)close();}));
 try{await video.play();if(stream!==next)return;$('live-empty').hidden=true;message('实时画面已连接','画面在当前设备识别，不上传、不录制');}catch(e){if(stream===next){release();message('画面播放失败','请重新点击开启摄像头。');}}
}
async function open(){
 const ticket=++generation;release();
 if(!window.isSecureContext){message('需要 HTTPS 地址','手机请通过 HTTPS 链接打开此页面；普通 HTTP 无法调用摄像头。');return;}
 if(!navigator.mediaDevices?.getUserMedia){message('当前浏览器不支持摄像头','请使用手机 Safari 或 Chrome 打开 HTTPS 网页。');return;}
 start.disabled=true;message('等待摄像头授权','请在浏览器提示中允许使用摄像头。');
 try{const next=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:facing},width:{ideal:1280},height:{ideal:720}}});if(ticket!==generation){next.getTracks().forEach(t=>t.stop());return;}await attach(next,'手机 / 本机摄像头');}
 catch(e){if(ticket!==generation)return;const errors={NotAllowedError:'摄像头权限被拒绝，请在浏览器网站设置中允许后重试。',NotFoundError:'没有找到摄像头，请在手机上打开此页面测试。',NotReadableError:'摄像头被其他应用占用，请关闭占用程序后重试。',OverconstrainedError:'当前摄像头不支持所需参数，请换用系统浏览器。',SecurityError:'浏览器禁止访问摄像头，请使用 HTTPS 和系统浏览器。'};message('未能开启摄像头',errors[e.name]||'连接失败，请检查摄像头权限后重试。');}
 finally{if(ticket===generation)start.disabled=false;}
}
start.onclick=open;stop.onclick=close;flip.onclick=()=>{facing=facing==='environment'?'user':'environment';open();};
// Future DJI M4TD integration: a receiver obtains a WebRTC MediaStream,
// then calls helmetLiveMonitor.attachMediaStream(stream, 'DJI M4TD').
// Signaling / authentication / DJI stream gateway must be implemented separately.
window.helmetLiveMonitor={attachMediaStream:async(next,label='DJI M4TD')=>{if(!next||typeof next.getVideoTracks!=='function'||!next.getVideoTracks().length)throw new TypeError('A video MediaStream is required');generation++;await attach(next,label);},stop:close,startCamera:open};
window.addEventListener('pagehide',close);
if(!window.isSecureContext)message('等待 HTTPS 环境','手机请使用 HTTPS 链接打开，再点击开启摄像头。');
})();


(()=>{
const $=id=>document.getElementById(id),video=$('live-video'),screen=$('inference-canvas'),state=$('inference-state');
// Model adapters: replace the reserved entry after training/export and decoder validation.
const modelAdapters={yolov12:{path:'models/helmet.onnx'}};
const modelSelect=$('model-select');
function selectedModel(){return modelAdapters[modelSelect.value]||modelAdapters.yolov12;}
modelSelect.addEventListener('change',init);
const captured=document.createElement('canvas'),input=document.createElement('canvas');input.width=input.height=416;const ctx=input.getContext('2d',{willReadFrequently:true}),out=screen.getContext('2d');let worker,ready=false,pending=false,serial=0,epoch=0,frameInfo=null,watchdog;
function clear(){epoch++;screen.hidden=true;}
function disposeWorker(){if(!worker)return;worker.terminate();if(worker._resources){URL.revokeObjectURL(worker._resources.moduleURL);URL.revokeObjectURL(worker._resources.workerURL);}worker=null;}
let initEpoch=0,initializing=false,initTimer;
function suspendInference(){initEpoch++;initializing=false;clearTimeout(initTimer);clearTimeout(watchdog);disposeWorker();ready=false;pending=false;clear();state.textContent='开启摄像头后加载模型';}
window.helmetInference={suspend:suspendInference};
function ensureInference(){if(!ready&&!initializing)init();}
async function init(){initializing=true;clearTimeout(initTimer);const initTicket=++initEpoch;disposeWorker();clearTimeout(watchdog);ready=false;pending=false;clear();state.textContent='正在加载内置识别模型…';
if(location.protocol==='file:'){initializing=false;state.textContent='请将完整文件上传 GitHub Pages，通过 HTTPS 链接打开';return;}
initTimer=setTimeout(()=>{if(initTicket!==initEpoch)return;suspendInference();state.textContent='模型加载超时，请点击重载模型';},90000);
try{const base=new URL('../',import.meta.url);const resources=await Promise.all(['vendor/ort.wasm.min.js','js/detect-worker.js','vendor/ort-wasm-simd-threaded.mjs','vendor/ort-wasm-simd-threaded.wasm',selectedModel().path].map(async path=>{const response=await fetch(new URL(path,base));if(!response.ok)throw Error(path);return path.endsWith('.wasm')||path.endsWith('.onnx')?response.arrayBuffer():response.text();}));if(initTicket!==initEpoch)return;
console.log('HELMET assets ready');const [runtime,workerCode,moduleText,wasm,model]=resources;// A data module can be imported by file/srcdoc workers without crossing blob origins.
const moduleURL='data:text/javascript;charset=utf-8,'+encodeURIComponent(moduleText.replace('new URL("ort-wasm-simd-threaded.wasm",import.meta.url)','new URL("https://embedded.invalid/embedded.wasm")'));const workerURL=URL.createObjectURL(new Blob([runtime,';\n',workerCode],{type:'application/javascript'}));worker=new Worker(workerURL);worker._resources={moduleURL,workerURL,wasm,model};}catch(error){if(initTicket!==initEpoch)return;suspendInference();state.textContent='模型资源读取失败，请重载模型';return;}worker.onerror=()=>{if(initTicket!==initEpoch)return;initializing=false;clearTimeout(initTimer);ready=false;pending=false;clearTimeout(watchdog);screen.hidden=true;state.textContent='模型加载失败，请检查上传文件后点击重载模型';};
worker.onmessage=({data})=>{if(initTicket!==initEpoch)return;if(data.type!=='result')console.log('HELMET worker',data.type,data.message||'');if(data.type==='progress'){state.textContent=data.message;return;}if(data.type==='ready'){initializing=false;clearTimeout(initTimer);ready=true;state.textContent=video.srcObject&&!video.paused?'模型就绪 · 正在开始识别…':'模型就绪 · 请开启摄像头';}else if(data.type==='error'){initializing=false;clearTimeout(initTimer);ready=false;pending=false;clearTimeout(watchdog);screen.hidden=true;state.textContent='识别失败，请重载模型：'+data.message;}else if(data.type==='result'){clearTimeout(watchdog);pending=false;const f=frameInfo;if(!f||data.id!==f.id||f.epoch!==epoch||video.srcObject!==f.source||video.paused)return;
screen.width=captured.width;screen.height=captured.height;out.drawImage(captured,0,0);for(const b of data.boxes){let [x1,y1,x2,y2]=b.xyxy;x1=Math.max(0,(x1-f.left)/f.scale);x2=Math.min(screen.width,(x2-f.left)/f.scale);y1=Math.max(0,(y1-f.top)/f.scale);y2=Math.min(screen.height,(y2-f.top)/f.scale);if(x2<=x1||y2<=y1)continue;const color=b.cls===7?'#ec6253':b.cls===0?'#00a68c':'#3889df';const displayWidth=Math.max(1,video.getBoundingClientRect().width||document.querySelector('.live-screen').getBoundingClientRect().width||captured.width),ratio=screen.width/displayWidth,fontSize=Math.round(Math.max(24,(parseFloat(getComputedStyle(document.querySelector('.live-heading h2')).fontSize)||18)*1.3)*ratio),padding=Math.round(7*ratio),labelHeight=Math.round(fontSize*1.45);out.strokeStyle=color;out.lineWidth=6*ratio;out.strokeStyle='rgba(0,0,0,.65)';out.strokeRect(x1,y1,x2-x1,y2-y1);out.lineWidth=4*ratio;out.strokeStyle=color;out.strokeRect(x1,y1,x2-x1,y2-y1);out.font='700 '+fontSize+'px '+getComputedStyle(document.querySelector('.live-heading h2')).fontFamily;const text=b.cls===0?'带安全帽':'未带安全帽',w=Math.min(screen.width,out.measureText(text).width+padding*2),labelX=Math.max(0,Math.min(x1,screen.width-w)),labelY=Math.max(0,Math.min(screen.height-labelHeight,y1-labelHeight));out.fillStyle=b.cls===7?'#ad2922':b.cls===0?'#086b59':'#185594';out.fillRect(labelX,labelY,w,labelHeight);out.fillStyle='#fff';out.textBaseline='middle';out.fillText(text,labelX+padding,labelY+labelHeight/2,w-padding*2);}screen.hidden=false;window.dispatchEvent(new CustomEvent("helmet-detection",{detail:{boxes:data.boxes,ms:data.ms,canvas:screen}}));state.textContent=data.boxes.length?`识别中 · 带安全帽 ${data.boxes.filter(b=>b.cls===0).length} · 未带安全帽 ${data.boxes.filter(b=>b.cls===7).length} · ${data.ms} ms`:`识别中 · 暂未检出目标 · ${data.ms} ms`;}};
worker.postMessage({type:'init',mjs:worker._resources.moduleURL,wasm:worker._resources.wasm,model:worker._resources.model},[worker._resources.wasm,worker._resources.model]);
}
function tick(){if(!ready||pending||video.paused||!video.srcObject||!video.videoWidth||document.hidden)return;
captured.width=Math.min(960,video.videoWidth);captured.height=Math.round(video.videoHeight*captured.width/video.videoWidth);captured.getContext('2d').drawImage(video,0,0,captured.width,captured.height);
const scale=Math.min(416/captured.width,416/captured.height),w=Math.round(captured.width*scale),h=Math.round(captured.height*scale),left=Math.floor((416-w)/2),top=Math.floor((416-h)/2);ctx.fillStyle='rgb(114,114,114)';ctx.fillRect(0,0,416,416);ctx.drawImage(captured,0,0,captured.width,captured.height,left,top,w,h);const rgba=ctx.getImageData(0,0,416,416).data,pixels=new Float32Array(3*416*416),area=416*416;for(let i=0;i<area;i++){pixels[i]=rgba[i*4]/255;pixels[area+i]=rgba[i*4+1]/255;pixels[area*2+i]=rgba[i*4+2]/255;}
frameInfo={id:++serial,epoch,source:video.srcObject,left,top,scale};pending=true;worker.postMessage({type:'frame',id:serial,pixels},[pixels.buffer]);watchdog=setTimeout(()=>{disposeWorker();pending=false;ready=false;screen.hidden=true;state.textContent='识别超时，请点击重载模型重试';},30000);
}
$('reload-model').onclick=init;video.addEventListener('emptied',suspendInference);video.addEventListener('playing',ensureInference);video.addEventListener('pause',clear);document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});window.addEventListener('pagehide',suspendInference);window.addEventListener('pageshow',e=>{if(e.persisted&&video.srcObject)ensureInference();});setInterval(tick,180);state.textContent='开启摄像头后加载模型';
})();



(()=>{const video=document.getElementById('live-video'),screen=document.querySelector('.live-screen');function fitCamera(){if(video.videoWidth&&video.videoHeight)screen.style.setProperty('--camera-ratio',video.videoWidth+' / '+video.videoHeight);}video.addEventListener('loadedmetadata',fitCamera);video.addEventListener('resize',fitCamera);video.addEventListener('playing',fitCamera);window.addEventListener('resize',fitCamera);})();
