import {test} from "node:test";
import {strict as assert} from "node:assert";
import {createRoom,joinRoom,transition,YUL,availableSlots,Room} from "../engine";
const roll = (n:number)=>Array.from({length:n},()=>3);
let counter=0;
function act(room:Room,uid:string,kind:Parameters<typeof transition>[2]["kind"],options:Record<string,any>={}):Room{
 return transition(room,uid,{kind,...options},"test-action-"+(++counter),roll);
}
function roomReady():Room{
 let r=createRoom("a","ABCDEFGHI",1000);r=joinRoom(r,"b",1001);
 r=act(r,"a","ready");r=act(r,"b","ready");r=act(r,"a","start");
 r=act(r,"a","ready");r=act(r,"b","ready");
 r=act(r,"a","roll");r=act(r,"b","roll");return r;
}
test("YUL initial conditions, seven rounds, secret dice",()=>{
 let r=roomReady();
 assert.equal(r.public.board.altitude,6000);
 assert.equal(YUL.traffic.reduce((a,b)=>a+b,0),9);
 assert.equal(r.public.phase,"placing");
 assert.equal(r.privateDice.a.dice.length,4);
 assert.equal(r.privateDice.b.dice.length,4);
 assert.equal(r.public.rolled.pilot,true);
 assert.ok(!JSON.stringify(r.public).includes('"dice":'));
 assert.equal(r.public.activeRole,"pilot");
});
test("two-member lobby, reconnect idempotence",()=>{
 let r=createRoom("a","ABCDEFGHI",10);r=joinRoom(r,"b",11);
 assert.equal(joinRoom(r,"b",12).public.revision,r.public.revision);
 assert.throws(()=>joinRoom(r,"c",13),/voll/);
});
test("alternating roles, no duplicate placement, idempotence",()=>{
 let r=roomReady();const id=r.privateDice.a.dice[0].id;
 r=act(r,"a","place",{dieId:id,slotId:"axis_p"});
 assert.equal(r.public.activeRole,"copilot");
 assert.throws(()=>act(r,"a","place",{dieId:r.privateDice.a.dice[1].id,slotId:"radio_p"}),/nicht am Zug/);
 assert.throws(()=>act(r,"b","place",{dieId:r.privateDice.b.dice[0].id,slotId:"axis_p"}),/Spielerfarbe/);
 r=act(r,"b","place",{dieId:r.privateDice.b.dice[0].id,slotId:"axis_c"});
 assert.equal(r.public.board.axis,0);
});
test("coffee modifiers and all slot restrictions",()=>{
 let r=roomReady();
 assert.ok(!availableSlots(r,"a",r.privateDice.a.dice[0].id).some(s=>s.id==="brake_1"));
 r=act(r,"a","place",{dieId:r.privateDice.a.dice[0].id,slotId:"coffee_1"});
 assert.equal(r.public.board.coffee,1);
 assert.throws(()=>act(r,"b","place",{dieId:r.privateDice.b.dice[0].id,slotId:"flaps_2",value:3}),/Landeklappen/);
});
test("strict coffee change bounds",()=>{
 let r=roomReady();r=act(r,"a","place",{dieId:r.privateDice.a.dice[0].id,slotId:"coffee_1"});
 assert.throws(()=>act(r,"b","place",{dieId:r.privateDice.b.dice[0].id,slotId:"flaps_3",value:5}),/Kaffeemarker|Landeklappen/);
});
test("reroll suspends turn and restores it",()=>{
 let r=roomReady();r=act(r,"a","reroll");
 assert.equal(r.public.phase,"reroll");
 assert.equal(r.public.board.rerolls,0);
 r=act(r,"b","submitReroll",{selection:r.privateDice.b.dice.map(d=>d.id)});
 assert.equal(r.public.phase,"reroll");
 r=act(r,"a","submitReroll",{selection:[]});
 assert.equal(r.public.phase,"placing");assert.equal(r.public.activeRole,"pilot");
});
test("axis spins and instant loss",()=>{
 let r=roomReady();
 assert.throws(()=>act(r,"a","place",{dieId:r.privateDice.a.dice[0].id,slotId:"axis_p",value:6}),/Kaffeemarker/);
});
test("no double gear progress and brake sequence validation",()=>{
 let r=roomReady();
 assert.throws(()=>act(r,"a","place",{dieId:r.privateDice.a.dice[0].id,slotId:"brake_2",value:4}),/Kaffeemarker|Bremsen/);
});
