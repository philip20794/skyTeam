/* Authoritative Sky Team YUL engine. No Firebase / Flutter dependencies.
 * Source: official Sky Team basic rules (Kosmos, Scorpion Masqué), pages 3-11.
 */
export type Role = "pilot" | "copilot";
export type Phase = "lobby" | "discussion" | "rolling" | "placing" | "reroll" | "finished";
export type SlotKind = "axis" | "engine" | "radio" | "gear" | "flaps" | "brake" | "coffee";
export interface Slot {
  id: string; kind: SlotKind; owner: Role | "both"; values?: number[];
  order?: number; x: number; y: number; w: number; h: number;
}
export interface Member { role: Role; ready: boolean; joinedAt: number; }
export interface Die { id: string; value: number; }
export interface PlacedDie { owner: Role; original: number; value: number; dieId: string; }
export interface PrivateState { dice: Die[]; rerollSelection?: string[]; }
export interface Board {
  axis: number; approach: number; traffic: number[]; airportIndex: number;
  altitude: number; round: number; blueThreshold: number; orangeThreshold: number;
  gear: boolean[]; flaps: boolean[]; brakes: boolean[];
  coffee: number; rerolls: number; claimedRerolls: number[];
  slots: Record<string, PlacedDie>; landingSpeed: number | null;
}
export interface PublicState {
  code: string; airportId: "YUL"; airportName: string; phase: Phase;
  revision: number; host: string; members: Record<string, Member>;
  activeRole: Role | null; rolled: Record<Role, boolean>;
  result: null | { won: boolean; reason: string };
  board: Board; actionIds: Record<string, boolean>; rerollPending: Role[] | null;
}
export interface Room { public: PublicState; privateDice: Record<string, PrivateState>; }
export interface Action {
  kind: "ready" | "start" | "roll" | "place" | "reroll" | "submitReroll" | "swapRoles" | "restart" | "leave";
  dieId?: string; slotId?: string; value?: number; selection?: string[];
}
export type DiceSource = (count: number) => number[];
const slots: Slot[] = [
  {id:"axis_p",kind:"axis",owner:"pilot",x:.29,y:.24,w:.15,h:.075},
  {id:"axis_c",kind:"axis",owner:"copilot",x:.56,y:.24,w:.15,h:.075},
  {id:"engine_p",kind:"engine",owner:"pilot",x:.38,y:.62,w:.12,h:.075},
  {id:"engine_c",kind:"engine",owner:"copilot",x:.52,y:.62,w:.12,h:.075},
  {id:"radio_p",kind:"radio",owner:"pilot",x:.06,y:.15,w:.14,h:.07},
  {id:"radio_c1",kind:"radio",owner:"copilot",x:.80,y:.13,w:.14,h:.07},
  {id:"radio_c2",kind:"radio",owner:"copilot",x:.80,y:.22,w:.14,h:.07},
  {id:"gear_1",kind:"gear",owner:"pilot",values:[1,2],order:0,x:.06,y:.37,w:.14,h:.07},
  {id:"gear_2",kind:"gear",owner:"pilot",values:[3,4],order:1,x:.06,y:.47,w:.14,h:.07},
  {id:"gear_3",kind:"gear",owner:"pilot",values:[5,6],order:2,x:.06,y:.57,w:.14,h:.07},
  {id:"flaps_1",kind:"flaps",owner:"copilot",values:[1,2],order:0,x:.80,y:.34,w:.14,h:.07},
  {id:"flaps_2",kind:"flaps",owner:"copilot",values:[2,3],order:1,x:.80,y:.44,w:.14,h:.07},
  {id:"flaps_3",kind:"flaps",owner:"copilot",values:[4,5],order:2,x:.80,y:.54,w:.14,h:.07},
  {id:"flaps_4",kind:"flaps",owner:"copilot",values:[5,6],order:3,x:.80,y:.64,w:.14,h:.07},
  {id:"brake_1",kind:"brake",owner:"pilot",values:[2],order:0,x:.32,y:.77,w:.10,h:.065},
  {id:"brake_2",kind:"brake",owner:"pilot",values:[4],order:1,x:.45,y:.77,w:.10,h:.065},
  {id:"brake_3",kind:"brake",owner:"pilot",values:[6],order:2,x:.58,y:.77,w:.10,h:.065},
  {id:"coffee_1",kind:"coffee",owner:"both",x:.28,y:.88,w:.12,h:.065},
  {id:"coffee_2",kind:"coffee",owner:"both",x:.45,y:.88,w:.12,h:.065},
  {id:"coffee_3",kind:"coffee",owner:"both",x:.62,y:.88,w:.12,h:.065},
];
export const SLOTS = Object.freeze(slots);
const byId = Object.fromEntries(slots.map(s => [s.id,s])) as Record<string,Slot>;
export const YUL = Object.freeze({
  airportId: "YUL" as const, airportName: "YUL Montréal-Trudeau",
  // Bottom/current position is 0, runway is 7. Nine initial aircraft markers.
  traffic: [0,0,1,2,1,3,2,0], airportIndex: 7, startingAltitude: 6000,
});
export const otherRole = (r:Role):Role => r==="pilot"?"copilot":"pilot";
function fail(text:string):never {throw Error(text);}
function assert(ok:unknown,reason:string):asserts ok {if(!ok)fail(reason);}
function memberForRole(p:PublicState, role:Role):string {
 const uid=Object.keys(p.members).find(uid=>p.members[uid].role===role);
 assert(uid,"Rolle ist nicht vergeben."); return uid;
}
function isReady(p:PublicState):boolean {
 return Object.keys(p.members).length===2&&Object.values(p.members).every(x=>x.ready);
}
export function createRoom(uid:string,code:string,now:number):Room {
 const publicState:PublicState={
  code,airportId:"YUL",airportName:YUL.airportName,phase:"lobby",
  revision:0,host:uid,members:{[uid]:{role:"pilot",ready:false,joinedAt:now}},
  activeRole:null,rolled:{pilot:false,copilot:false},result:null,actionIds:{},rerollPending:null,
  board:{axis:0,approach:0,traffic:[...YUL.traffic],airportIndex:YUL.airportIndex,
   altitude:6000,round:1,blueThreshold:5,orangeThreshold:9,
   gear:[false,false,false],flaps:[false,false,false,false],brakes:[false,false,false],
   coffee:0,rerolls:0,claimedRerolls:[],slots:{},landingSpeed:null}
 };
 return {public:publicState,privateDice:{[uid]:{dice:[]}}};
}
export function joinRoom(room:Room,uid:string,now:number):Room {
 const r=structuredClone(room);
 if(r.public.members[uid])return r;
 assert(r.public.phase==="lobby","Die Partie wurde bereits gestartet.");
 assert(Object.keys(r.public.members).length<2,"Die Lobby ist voll.");
 r.public.members[uid]={role:"copilot",ready:false,joinedAt:now};
 r.privateDice[uid]={dice:[]};r.public.revision++;return r;
}
export function availableSlots(room:Room,uid:string,dieId:string):Slot[] {
 const r=room.public, own=room.privateDice[uid];
 if(r.phase!=="placing"||r.members[uid]?.role!==r.activeRole||!own)return [];
 const die=own.dice.find(d=>d.id===dieId);
 if(!die)return [];
 return slots.filter(s=>s.owner==="both"||s.owner===r.members[uid].role)
  .filter(s=>!r.board.slots[s.id])
  .filter(s=>s.kind!=="flaps"||s.order===r.board.flaps.findIndex(x=>!x))
  .filter(s=>s.kind!=="brake"||s.order===r.board.brakes.findIndex(x=>!x))
  .filter(s=>!s.values||s.values.some(v=>Math.abs(v-die.value)<=r.board.coffee));
}
function finish(p:PublicState,reason:string,won=false):void{
 p.phase="finished";p.result={won,reason};p.activeRole=null;
}
function applySlot(p:PublicState,slot:Slot,value:number):void{
 const b=p.board;
 if(slot.kind==="axis"){
  const a=b.slots["axis_p"],c=b.slots["axis_c"];
  if(a&&c){b.axis+=a.value-c.value;
   if(Math.abs(b.axis)>=3)finish(p,"Das Flugzeug ist ins Trudeln geraten.");
  }
 }
 if(slot.kind==="engine"){
  const a=b.slots["engine_p"],c=b.slots["engine_c"];
  if(a&&c){
   const speed=a.value+c.value;
   if(b.round===7){b.landingSpeed=speed;return;}
   const moves=speed<b.blueThreshold?0:speed<b.orangeThreshold?1:2;
   for(let i=0;i<moves;i++){
    if(b.approach===b.airportIndex){finish(p,"Über den Flughafen hinausgeflogen.");return;}
    if(b.traffic[b.approach]>0){finish(p,"Zusammenstoß mit Flugverkehr.");return;}
    b.approach++;
   }
  }
 }
 if(slot.kind==="radio"){
  const target=b.approach+value-1;
  if(target<b.traffic.length&&b.traffic[target]>0)b.traffic[target]--;
 }
 if(slot.kind==="gear"){
  const i=slot.order!;
  if(!b.gear[i]){b.gear[i]=true;b.blueThreshold++;}
 }
 if(slot.kind==="flaps"){
  const i=slot.order!;if(!b.flaps[i]){b.flaps[i]=true;b.orangeThreshold++;}
 }
 if(slot.kind==="brake"){b.brakes[slot.order!]=true;}
 if(slot.kind==="coffee"){b.coffee=Math.min(3,b.coffee+1);}
}
function checkLanding(p:PublicState):void{
 const b=p.board;
 if(b.approach!==b.airportIndex){finish(p,"Flughafen nicht erreicht.");return;}
 if(b.traffic.some(n=>n!==0)){finish(p,"Nicht alle Flugzeuge wurden entfernt.");return;}
 if(b.gear.some(x=>!x)){finish(p,"Fahrwerk nicht vollständig ausgefahren.");return;}
 if(b.flaps.some(x=>!x)){finish(p,"Landeklappen nicht vollständig ausgefahren.");return;}
 if(b.axis!==0){finish(p,"Flugzeug ist nicht waagerecht.");return;}
 if(b.landingSpeed===null){finish(p,"Triebwerke fehlen.");return;}
 const brakeStrength=2*b.brakes.filter(Boolean).length+.5;
 if(b.landingSpeed>=brakeStrength){finish(p,"Bremskraft reicht nicht aus.");return;}
 finish(p,"Sicher auf Montréal-Trudeau gelandet!",true);
}
function roundEnd(p:PublicState):void {
 const b=p.board;
 if(["axis_p","axis_c","engine_p","engine_c"].some(id=>!b.slots[id])){
  finish(p,"Pflichtwürfel fehlen (Ruder oder Triebwerke).");return;
 }
 if(b.round===7){checkLanding(p);return;}
 b.altitude-=1000;b.round++;b.slots={};
 p.rolled={pilot:false,copilot:false};p.activeRole=null;p.phase="discussion";
 for(const player of Object.values(p.members))player.ready=false;
 if(b.altitude===0&&b.approach!==b.airportIndex){
  finish(p,"Flughafen beim Erreichen der Landungshöhe verfehlt.");return;
 }
 if([6000,2000].includes(b.altitude)&&!b.claimedRerolls.includes(b.altitude)){
   b.claimedRerolls.push(b.altitude);b.rerolls++;
 }
}
export function transition(input:Room,uid:string,action:Action,actionId:string,roll:DiceSource):Room {
 assert(typeof actionId==="string"&&actionId.length>=8&&actionId.length<=100,"Aktions-ID fehlt.");
 const room=structuredClone(input),p=room.public;
 assert(p.members[uid],"Du bist nicht Mitglied dieser Partie.");
 if(p.actionIds[actionId])return room;
 const me=p.members[uid],b=p.board,privateState=room.privateDice[uid];
 const myRole=me.role;
 if(action.kind==="swapRoles"){
  assert(uid===p.host&&p.phase==="lobby","Nur der Host darf vor dem Start Rollen tauschen.");
  for(const mem of Object.values(p.members)){mem.role=otherRole(mem.role);mem.ready=false;}
 } else if(action.kind==="ready"){
  assert(["lobby","discussion"].includes(p.phase),"Bereitschaft ist hier nicht möglich.");
  me.ready=true;
  if(p.phase==="discussion"&&isReady(p))p.phase="rolling";
 } else if(action.kind==="start"){
  assert(uid===p.host&&p.phase==="lobby"&&isReady(p),"Beide Spieler müssen bereit sein.");
  p.phase="discussion";Object.values(p.members).forEach(x=>x.ready=false);
  b.rerolls=1;b.claimedRerolls=[6000];
 } else if(action.kind==="roll"){
  assert(p.phase==="rolling"&&!p.rolled[myRole],"Jetzt darfst du nicht würfeln.");
  const values=roll(4);
  assert(values.length===4&&values.every(x=>Number.isInteger(x)&&x>=1&&x<=6),"Würfelquelle ungültig.");
  privateState.dice=values.map((value,i)=>({id:String(b.round)+"-"+myRole+"-"+i,value}));
  p.rolled[myRole]=true;
  if(p.rolled.pilot&&p.rolled.copilot){
   p.phase="placing";p.activeRole=b.round%2===1?"pilot":"copilot";
  }
 } else if(action.kind==="place"){
  assert(p.phase==="placing"&&p.activeRole===myRole,"Du bist nicht am Zug.");
  const die=privateState.dice.find(x=>x.id===action.dieId);
  assert(die,"Würfel nicht verfügbar.");
  const slot=byId[action.slotId??""];
  assert(slot,"Dieses Cockpitfeld existiert nicht.");
  assert(slot.owner==="both"||slot.owner===myRole,"Falsche Spielerfarbe.");
  assert(!b.slots[slot.id],"Dieses Cockpitfeld ist bereits belegt.");
  const value=action.value??die.value;
  assert(Number.isInteger(value)&&value>=1&&value<=6,"Würfelwert außerhalb 1–6.");
  const cost=Math.abs(value-die.value);
  assert(cost<=b.coffee,"Nicht genug Kaffeemarker.");
  assert(!slot.values||slot.values.includes(value),"Würfelwert hier nicht erlaubt.");
  if(slot.kind==="flaps")assert(slot.order===b.flaps.findIndex(v=>!v),"Landeklappen müssen der Reihe nach ausgefahren werden.");
  if(slot.kind==="brake")assert(slot.order===b.brakes.findIndex(v=>!v),"Bremsen müssen der Reihe nach aktiviert werden.");
  b.coffee-=cost;
  b.slots[slot.id]={owner:myRole,original:die.value,value,dieId:die.id};
  privateState.dice=privateState.dice.filter(x=>x.id!==die.id);
  applySlot(p,slot,value);
  if(p.result===null){
   if(Object.keys(b.slots).length===8){
    // Two mandatory placements each, plus four discretionary dice.
    room.privateDice[memberForRole(p,"pilot")].dice=[];
    room.privateDice[memberForRole(p,"copilot")].dice=[];
    roundEnd(p);
   } else p.activeRole=otherRole(myRole);
  }
 } else if(action.kind==="reroll"){
  assert(p.phase==="placing"&&b.rerolls>0,"Neuwurf derzeit nicht verfügbar.");
  b.rerolls--;p.phase="reroll";p.rerollPending=["pilot","copilot"];
 } else if(action.kind==="submitReroll"){
  assert(p.phase==="reroll"&&p.rerollPending?.includes(myRole),"Neuwurf-Auswahl nicht möglich.");
  const selection=action.selection??[];
  assert(Array.isArray(selection)&&new Set(selection).size===selection.length,"Ungültige Neuwurf-Auswahl.");
  assert(selection.every(id=>privateState.dice.some(d=>d.id===id)),"Nur verfügbare eigene Würfel neu werfen.");
  const values=roll(selection.length);
  assert(values.length===selection.length&&values.every(x=>Number.isInteger(x)&&x>=1&&x<=6),"Würfelquelle ungültig.");
  privateState.dice=privateState.dice.map(d=>{
   const i=selection.indexOf(d.id);return i<0?d:{...d,value:values[i]};
  });
  p.rerollPending=(p.rerollPending??[]).filter(r=>r!==myRole);
  if(p.rerollPending.length===0){p.rerollPending=null;p.phase="placing";}
 } else if(action.kind==="restart"){
  assert(uid===p.host&&p.phase==="finished","Nur der Host kann nach Spielende neu starten.");
  const reset=createRoom(p.host,p.code,Date.now());
  reset.public.members=structuredClone(p.members);
  Object.values(reset.public.members).forEach(x=>x.ready=false);
  for(const id of Object.keys(reset.public.members))reset.privateDice[id]={dice:[]};
  reset.public.revision=p.revision+1;
  return reset;
 } else if(action.kind==="leave"){
  assert(p.phase==="lobby","Nach Spielbeginn kann die Partie nur verlassen werden, wenn sie beendet ist.");
  delete p.members[uid];delete room.privateDice[uid];
 } else fail("Unbekannte Aktion.");
 p.actionIds[actionId]=true;
 // Keep a bounded idempotency cache.
 const keys=Object.keys(p.actionIds);
 if(keys.length>150)for(const key of keys.slice(0,keys.length-150))delete p.actionIds[key];
 p.revision++;
 return room;
}
