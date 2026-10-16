import {randomInt, randomBytes} from "node:crypto";
import {initializeApp} from "firebase-admin/app";
import {getDatabase} from "firebase-admin/database";
import {onCall, HttpsError, CallableRequest} from "firebase-functions/v2/https";
import {createRoom as newRoom, joinRoom as enterRoom, transition, Action, Room} from "./engine";

initializeApp();
const db = getDatabase();
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const code = ():string => Array.from({length:9},()=>ALPHABET[randomInt(ALPHABET.length)]).join("");
const roll = (count:number):number[]=>Array.from({length:count},()=>randomInt(1,7));
type RequestData = {roomId?:string; code?:string; actionId?:string; dieId?:string;
  slotId?:string; value?:number; selection?:string[]; };
function uidOf(req:CallableRequest):string{
 if(!req.auth)throw new HttpsError("unauthenticated","Anonyme Anmeldung erforderlich.");
 return req.auth.uid;
}
function roomCode(value:unknown):string {
 if(typeof value!=="string"||!/^[A-HJ-NP-Z2-9]{9}$/.test(value.trim().toUpperCase())){
  throw new HttpsError("invalid-argument","Ungültiger Einladungscode.");
 }
 return value.trim().toUpperCase();
}
function errorOf(e:unknown):never {
 if(e instanceof HttpsError)throw e;
 const message=e instanceof Error?e.message:"Unbekannter Spielfehler.";
 throw new HttpsError("failed-precondition",message);
}
function actionKey(data:RequestData):string{
 if(typeof data.actionId!=="string"||!(/^[a-zA-Z0-9._:-]{8,100}$/).test(data.actionId))
  throw new HttpsError("invalid-argument","Aktions-ID fehlt oder ist ungültig.");
 return data.actionId;
}
async function throttle(uid:string,key:string,limit:number):Promise<void>{
 const minute=Math.floor(Date.now()/60000);
 const ref=db.ref("rateLimits/"+uid+"/"+key);
 const result=await ref.transaction((old:unknown)=>{
  const item=old as {minute:number;count:number}|null;
  if(!item||item.minute!==minute)return {minute,count:1};
  if(item.count>=limit)return;
  return {minute,count:item.count+1};
 },undefined,false);
 if(!result.committed)throw new HttpsError("resource-exhausted","Zu viele Anfragen. Bitte kurz warten.");
}
async function mutate(req:CallableRequest<RequestData>,kind:Action["kind"]):Promise<{revision:number;phase:string}>{
 const uid=uidOf(req),data=req.data??{};
 const id=roomCode(data.roomId);
 const key=actionKey(data);
 let blocked:string|null=null;
 const result=await db.ref("rooms/"+id).transaction((old:Room|null)=>{
  if(!old){blocked="Lobby nicht gefunden.";return;}
  try {
   const action:Action={kind,dieId:data.dieId,slotId:data.slotId,value:data.value,selection:data.selection};
   return transition(old,uid,action,key,roll);
  }catch(e){blocked=e instanceof Error?e.message:"Ungültige Aktion.";return;}
 },undefined,false);
 if(!result.committed)throw new HttpsError("failed-precondition",blocked??"Die Aktion konnte nicht abgeschlossen werden.");
 const p=(result.snapshot.val() as Room).public;
 return {revision:p.revision,phase:p.phase};
}
export const createRoom=onCall({region:"europe-west1"},async req=>{
 const uid=uidOf(req);await throttle(uid,"create",6);
 for(let attempts=0;attempts<6;attempts++){
  const id=code();const room=newRoom(uid,id,Date.now());
  const result=await db.ref("rooms/"+id).transaction((old:Room|null)=>old===null?room:undefined,undefined,false);
  if(result.committed){
   await db.ref("userRooms/"+uid).set(id);
   return {roomId:id,code:id};
  }
 }
 throw new HttpsError("unavailable","Lobby konnte nicht erstellt werden. Bitte erneut versuchen.");
});
export const joinRoom=onCall({region:"europe-west1"},async req=>{
 const uid=uidOf(req);await throttle(uid,"join",15);
 const id=roomCode((req.data as RequestData)?.code);
 let failure:string|null=null;
 const result=await db.ref("rooms/"+id).transaction((old:Room|null)=>{
  if(!old){failure="Lobby nicht gefunden.";return;}
  try{return enterRoom(old,uid,Date.now());}
  catch(e){failure=e instanceof Error?e.message:"Beitritt nicht möglich.";return;}
 },undefined,false);
 if(!result.committed)throw new HttpsError("failed-precondition",failure??"Beitritt fehlgeschlagen.");
 await db.ref("userRooms/"+uid).set(id);
 return {roomId:id,code:id};
});
export const resumeGame=onCall({region:"europe-west1"},async req=>{
 const uid=uidOf(req);const snap=await db.ref("userRooms/"+uid).get();
 const id=snap.val() as string|null;
 if(!id)return {roomId:null};
 const member=await db.ref("rooms/"+id+"/public/members/"+uid).get();
 return {roomId:member.exists()?id:null};
});
export const setReady=onCall({region:"europe-west1"},req=>mutate(req,"ready"));
export const changeRoles=onCall({region:"europe-west1"},req=>mutate(req,"swapRoles"));
export const startGame=onCall({region:"europe-west1"},req=>mutate(req,"start"));
export const rollMyDice=onCall({region:"europe-west1"},req=>mutate(req,"roll"));
export const placeDie=onCall({region:"europe-west1"},req=>mutate(req,"place"));
export const requestReroll=onCall({region:"europe-west1"},req=>mutate(req,"reroll"));
export const submitRerollSelection=onCall({region:"europe-west1"},req=>mutate(req,"submitReroll"));
export const restartGame=onCall({region:"europe-west1"},req=>mutate(req,"restart"));
export const leaveRoom=onCall({region:"europe-west1"},async req=>{
 const uid=uidOf(req);
 const result=await mutate(req,"leave");
 const id=roomCode((req.data as RequestData)?.roomId);
 const member=await db.ref("rooms/"+id+"/public/members/"+uid).get();
 if(!member.exists())await db.ref("userRooms/"+uid).remove();
 return result;
});
