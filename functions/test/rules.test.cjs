const {test, before, after} = require("node:test");
const {readFileSync} = require("node:fs");
const {initializeTestEnvironment, assertFails, assertSucceeds} = require("@firebase/rules-unit-testing");
const {get, set, ref} = require("firebase/database");

const id = "ABCDEFGH2";
let env;
before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-skyteam",
    database: {rules:readFileSync("../database.rules.json","utf8")},
  });
  await env.withSecurityRulesDisabled(async (context) => {
    const db=context.database();
    await set(ref(db,"rooms/"+id+"/public"),{
      members:{alice:{role:"pilot"},bob:{role:"copilot"}},
      phase:"placing",
      board:{axis:0},
    });
    await set(ref(db,"rooms/"+id+"/privateDice/alice"),{dice:[{id:"a",value:6}]});
    await set(ref(db,"rooms/"+id+"/privateDice/bob"),{dice:[{id:"b",value:1}]});
    await set(ref(db,"userRooms/alice"),id);
  });
});
after(async()=>{if(env)await env.cleanup();});
test("only members can read common room state",async()=>{
  await assertSucceeds(get(ref(env.authenticatedContext("alice").database(),"rooms/"+id+"/public")));
  await assertSucceeds(get(ref(env.authenticatedContext("bob").database(),"rooms/"+id+"/public")));
  await assertFails(get(ref(env.authenticatedContext("eve").database(),"rooms/"+id+"/public")));
  await assertFails(get(ref(env.unauthenticatedContext().database(),"rooms/"+id+"/public")));
});
test("private dice cannot be read by the partner or from their parent",async()=>{
  await assertSucceeds(get(ref(env.authenticatedContext("alice").database(),"rooms/"+id+"/privateDice/alice")));
  await assertFails(get(ref(env.authenticatedContext("alice").database(),"rooms/"+id+"/privateDice/bob")));
  await assertFails(get(ref(env.authenticatedContext("alice").database(),"rooms/"+id+"/privateDice")));
  await assertFails(get(ref(env.authenticatedContext("alice").database(),"rooms/"+id)));
  await assertFails(get(ref(env.authenticatedContext("eve").database(),"rooms/"+id+"/privateDice/alice")));
});
test("clients cannot forge public actions, private dice or room metadata",async()=>{
  const database=env.authenticatedContext("alice").database();
  await assertFails(set(ref(database,"rooms/"+id+"/public/board/axis"),2));
  await assertFails(set(ref(database,"rooms/"+id+"/privateDice/alice/dice/0/value"),6));
  await assertFails(set(ref(database,"userRooms/alice"),"SOMENEWID"));
  await assertFails(set(ref(database,"roomCodes/ATTACK"),"room"));
});
test("only authenticated members may write their own presence",async()=>{
  const alice=env.authenticatedContext("alice").database();
  await assertSucceeds(set(ref(alice,"presence/"+id+"/alice"),{connected:true,lastSeen:123}));
  await assertFails(set(ref(alice,"presence/"+id+"/bob"),{connected:true,lastSeen:124}));
  await assertFails(set(ref(env.authenticatedContext("eve").database(),"presence/"+id+"/eve"),{connected:true,lastSeen:124}));
  await assertFails(set(ref(alice,"presence/"+id+"/alice"),{connected:"yes",lastSeen:124}));
});
test("user-room lookup readable only by owner",async()=>{
  await assertSucceeds(get(ref(env.authenticatedContext("alice").database(),"userRooms/alice")));
  await assertFails(get(ref(env.authenticatedContext("bob").database(),"userRooms/alice")));
});
