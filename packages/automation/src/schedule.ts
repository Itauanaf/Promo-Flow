import type { AutomationRule } from "./rules";

function zonedParts(date:Date,timeZone:string){const parts=new Intl.DateTimeFormat("en-US",{timeZone,weekday:"short",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(date);const get=(type:Intl.DateTimeFormatPartTypes)=>parts.find(p=>p.type===type)?.value??"";const dayMap:Record<string,number>={Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6};return{weekday:dayMap[get("weekday")]??-1,minutes:Number(get("hour"))*60+Number(get("minute"))};}
const timeToMinutes=(value:string)=>{const[h,m]=value.split(":").map(Number);return h!*60+m!;};
const within=(value:number,start:number,end:number)=>start<=end?value>=start&&value<=end:value>=start||value<=end;
export function isScheduleOpen(schedule:AutomationRule["schedule"],at=new Date()){const local=zonedParts(at,schedule.timezone);if(!schedule.weekdays.includes(local.weekday))return false;if(!within(local.minutes,timeToMinutes(schedule.start),timeToMinutes(schedule.end)))return false;if(schedule.quietStart&&schedule.quietEnd&&within(local.minutes,timeToMinutes(schedule.quietStart),timeToMinutes(schedule.quietEnd)))return false;return true;}
