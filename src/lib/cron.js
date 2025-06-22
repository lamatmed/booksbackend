import cron from "cron"
import https from "https"
const job  = new cron.CronJob("*/14 * * * *", function(){
    https.get(
        process.env.API_URL,(res)=>{
            if(res.statusCode===200) console.log("Get requet sent successfully");
            else console.log("Get requet Failed",res.statusCode);
        }
    )
    .on("Error",(e) => console.error("Error while sending requet",e))
});
export  default job