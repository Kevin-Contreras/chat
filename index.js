import express from "express"
import logger from "morgan"
import {Server} from "socket.io"
import {createServer} from 'node:http'
import dotenv from 'dotenv'
import { createClient } from "@libsql/client"
import path from "node:path"
const port = process.env.PORT ?? 3000
const  app = express()
app.use(express.static( path.join(process.cwd(), '/client')))

const server = createServer(app)
const io = new Server(server,{
    connectionStateRecovery:{
       
    }
})
dotenv.config()
const db = createClient({
    url:"libsql://open-azrael-kevin-contreras.turso.io",
    authToken:process.env.DB_TOKEN
})

await db.execute('CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY AUTOINCREMENT,content TEXT,user TEXT)')
io.on('connection',async(socket)=>{
   const  user = socket.handshake.auth.user??"anonimo"
    console.log("a user has connected")
    socket.on("disconnect",()=>{
        console.log("an user has disconnected")
    })
    socket.on("chat message",async(msg)=>{
        let result
        try{
            result = await db.execute({
                sql:"INSERT INTO messages(content,user) VALUES (:msg,:user)",
                args:{msg,user}
            })
        }catch(e){
            console.error(e)
            return
        }
        io.emit("chat message", msg,result.lastInsertRowid.toString(),user)
    })
        try{

            const results = await db.execute({
                sql:'SELECT id, content,user from messages WHERE id >?',
                args:[socket.handshake.auth.serverOffset ??0]
            })
            results.rows.forEach(row=>{
                socket.emit('chat message',row.content,row.id.toString(),row.user)
            })
        }catch(e){
            console.error(e)
        }

    
})


app.use(logger('dev'))
app.get('/',(req,res)=>{
    res.sendFile(process.cwd()+"/client/index.html")
    console.log(process.cwd()+"/client/index.html")
    
})
server.listen(port,()=>{
    console.log('server running on port '+port)
})