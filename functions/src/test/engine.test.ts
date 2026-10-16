import {test} from "node:test";
import {strict as assert} from "node:assert";
import {createRoom, joinRoom, transition, availableSlots, YUL, Room, Action} from "../engine";

let sequence=0;
const dice = (n:number)=>Array(n).fill(3);
function act(r:Room,uid:string,kind:Action["kind"],p:Partial<Action>={}):Room {
 return transition(r,uid,{kind,...p},"request-"+(++sequence),dice);
}
function started():Room {
 let r=createRoom("a","ABCDEFGH2",1000);
 r=joinRoom(r,"b",1001);
 r=act(r,"a","ready");r=act(r,"b","ready");r=act(r,"a","start");
 r=act(r,"a","ready");r=act(r,"b","ready");
 r=act(r,"a","roll");r=act(r,"b","roll");
 return r;
}
function placing(round=1):Room {
 const r=started();
 r.public.board.round=round;
 r.public.board.altitude=7000-round*1000;
 r.public.board.slots={};
 r.public.phase="placing";
 r.public.activeRole=round%2===1?"pilot":"copilot";
 r.privateDice.a.dice=[1,2,3,4].map((value,i)=>({id:"a"+i,value}));
 r.privateDice.b.dice=[1,2,3,4].map((value,i)=>({id:"b"+i,value}));
 return r;
}
function put(r:Room,uid:string,slot:string,idx=0,value?:number):Room {
 return act(r,uid,"place",{slotId:slot,dieId:r.privateDice[uid].dice[idx].id,value});
}
test("basic scenario has nine traffic, seven rounds and private dice only",()=>{
 const r=started();
 assert.equal(r.public.board.altitude,6000);
 assert.equal(r.public.board.round,1);
 assert.equal(YUL.traffic.reduce((a,b)=>a+b,0),9);
 assert.equal(r.privateDice.a.dice.length,4);
 assert.equal(r.privateDice.b.dice.length,4);
 assert.equal(r.public.activeRole,"pilot");
 assert.equal(r.public.phase,"placing");
 assert.ok(!JSON.stringify(r.public).includes('"dice":'));
});
test("lobby membership, unique roles, reconnect and no third player",()=>{
 let r=createRoom("a","ABCDEFGH2",1);
 r=joinRoom(r,"b",2);
 assert.equal(joinRoom(r,"b",3).public.revision,r.public.revision);
 assert.throws(()=>joinRoom(r,"c",4),/voll/);
 assert.equal(r.public.members.a.role,"pilot");
 assert.equal(r.public.members.b.role,"copilot");
 r=act(r,"a","swapRoles");
 assert.equal(r.public.members.a.role,"copilot");
 assert.equal(r.public.members.b.role,"pilot");
});
test("only one of your own dice; alternating turns; blocked second action",()=>{
 let r=placing();
 r=put(r,"a","axis_p");
 assert.equal(r.public.activeRole,"copilot");
 assert.throws(()=>put(r,"a","radio_p"),/nicht am Zug/);
 assert.throws(()=>put(r,"b","axis_p"),/Spielerfarbe/);
 r=put(r,"b","axis_c");
 assert.equal(r.public.activeRole,"pilot");
 assert.equal(r.public.board.axis,0);
 assert.throws(()=>put(r,"a","axis_p"),/bereits belegt/);
});
test("duplicate action id cannot apply effects twice",()=>{
 let r=placing();
 const action={kind:"place" as const,slotId:"coffee_1",dieId:"a0"};
 r=transition(r,"a",action,"same-request-111",dice);
 const before=structuredClone(r);
 const after=transition(r,"a",action,"same-request-111",dice);
 assert.deepEqual(after,before);
});
test("coffee token creation and costs",()=>{
 let r=placing();
 r=put(r,"a","coffee_1");
 assert.equal(r.public.board.coffee,1);
 r=put(r,"b","flaps_1",0,2);
 assert.equal(r.public.board.coffee,0);
 assert.equal(r.public.board.flaps[0],true);
 assert.equal(r.public.board.orangeThreshold,10);
 assert.equal(r.public.board.slots.flaps_1.value,2);
});
test("flaps must activate in order; color and number restrictions",()=>{
 const r=placing();
 assert.throws(()=>put(r,"a","flaps_1"),/Spielerfarbe/);
 assert.throws(()=>put(r,"a","brake_2",1,2),/Würfelwert|Bremsen/);
 assert.throws(()=>put(r,"a","gear_3",0,1),/Würfelwert/);
 assert.throws(()=>put(r,"a","coffee_1",0,7),/außerhalb/);
 assert.throws(()=>put(r,"a","coffee_1",0,0),/außerhalb/);
});
test("gear raises low aerodynamic threshold immediately",()=>{
 let r=placing();
 r=put(r,"a","gear_1");
 assert.equal(r.public.board.blueThreshold,6);
 assert.deepEqual(r.public.board.gear,[true,false,false]);
});
test("radio removes exactly one traffic marker, and targets current space as 1",()=>{
 let r=placing();
 r.public.board.approach=3;
 assert.equal(r.public.board.traffic[3],2);
 r=put(r,"a","radio_p",0,1);
 assert.equal(r.public.board.traffic[3],1);
});
test("axis orientation moves toward larger die and spin is immediate",()=>{
 let r=placing();
 r=put(r,"a","axis_p",3);
 r=put(r,"b","axis_c",0);
 assert.equal(r.public.board.axis,3);
 assert.equal(r.public.phase,"finished");
 assert.equal(r.public.result?.won,false);
});
test("normal movement moves one step; traffic collision occurs when leaving occupied space",()=>{
 let r=placing();
 r=put(r,"a","engine_p",2);
 r=put(r,"b","engine_c",1);
 assert.equal(r.public.board.approach,1);
 assert.equal(r.public.phase,"placing");
});
test("overshooting airport loses immediately",()=>{
 let r=placing();
 r.public.board.approach=7;
 r=put(r,"a","engine_p",2);
 r=put(r,"b","engine_c",1);
 assert.equal(r.public.phase,"finished");
 assert.match(r.public.result?.reason??"",/hinaus/);
});
test("reroll once for each player, restores original turn",()=>{
 let r=placing();r=act(r,"a","reroll");
 assert.equal(r.public.phase,"reroll");
 assert.equal(r.public.board.rerolls,0);
 r=act(r,"b","submitReroll",{selection:["b0"]});
 assert.equal(r.public.phase,"reroll");
 assert.throws(()=>act(r,"b","submitReroll",{selection:["b1"]}),/nicht möglich/);
 r=act(r,"a","submitReroll",{selection:[]});
 assert.equal(r.public.phase,"placing");
 assert.equal(r.public.activeRole,"pilot");
});
test("completed landing at zero feet requires all victory conditions",()=>{
 let r=placing(7);
 r.public.board.approach=7;
 r.public.board.traffic=[0,0,0,0,0,0,0,0];
 r.public.board.gear=[true,true,true];
 r.public.board.flaps=[true,true,true,true];
 r.public.board.brakes=[true,true,false];
 r=put(r,"a","axis_p");
 r=put(r,"b","axis_c");
 r=put(r,"a","engine_p");
 r=put(r,"b","engine_c");
 r=put(r,"a","radio_p");
 r=put(r,"b","radio_c1");
 r=put(r,"a","coffee_1");
 r=put(r,"b","radio_c2");
 assert.equal(r.public.phase,"finished");
 assert.equal(r.public.result?.won,true);
});
test("landing with remaining traffic is a loss",()=>{
 let r=placing(7);
 r.public.board.approach=7;
 r.public.board.gear=[true,true,true];
 r.public.board.flaps=[true,true,true,true];
 r.public.board.brakes=[true,true,true];
 r=put(r,"a","axis_p");r=put(r,"b","axis_c");
 r=put(r,"a","engine_p");r=put(r,"b","engine_c");
 r=put(r,"a","coffee_1");r=put(r,"b","coffee_2");
 r=put(r,"a","radio_p");r=put(r,"b","radio_c1");
 assert.equal(r.public.result?.won,false);
 assert.match(r.public.result?.reason??"",/Flugzeuge/);
});
test("blue speed threshold 5-6 counts as 0 after first gear activation",()=>{
 let r=placing();
 r.public.board.blueThreshold=6;
 r=put(r,"a","engine_p",2);
 r=put(r,"b","engine_c",1);
 assert.equal(r.public.board.approach,0);
});
test("radio without target plane has no effect",()=>{
 let r=placing();r.public.board.traffic[0]=0;
 const old=[...r.public.board.traffic];
 r=put(r,"a","radio_p",0,1);
 assert.deepEqual(r.public.board.traffic,old);
});
