import express from "express";
import cors from "cors";
import { io } from "./socket/socket.js";

const app = express();

/**
 * TRUST PROXY
 */
app.set("trust proxy", 1);

/**
 * INTERNAL CORS
 */
app.use(
    cors({
        origin: [
            // "http://localhost:5173",
            // "https://hostahospital.com",
            "*"
        ],
        methods: [
            "GET",
            "POST",
            "PUT",
            "DELETE",
            "PATCH",
            "OPTIONS",
        ],
        credentials: true,
    })
);

/**
 * BODY PARSER
 */
app.use(express.json({ limit: "10mb" }));
app.use(
    express.urlencoded({
        limit: "10mb",
        extended: true,
    })
);




app.post("/emit-event", async (req, res) => {
    try {
        const { event, userId, data } = req.body;

        if (!io) {
            return res.status(503).json({
                success: false,
                message: "Socket server not initialized yet"
            });
        }

        // Check if the adapter is working
        const rooms = io.sockets.adapter.rooms;

        // Emit to specific user room if userId provided
        if (userId) {
            const roomName = String(userId);

            console.log("📡 SOCKET EMIT:", {
                event,
                room: roomName,
                availableRooms: Array.from(rooms.keys()).filter(r => !r.startsWith('/')),
            });
            
            // Check if room exists
            const room = rooms.get(roomName);
            if (!room || room.size === 0) {
                return res.status(200).json({
                    success: true,
                    message: `No users connected in room ${roomName}; event skipped`,
                    availableRooms: Array.from(rooms.keys()).filter(r => !r.startsWith('/')),
                    roomEmpty: true
                });
            }

            // Emit the event
            io.to(roomName).emit(event, data);
            
            console.log(`✅ Event '${event}' emitted to room ${roomName} (${room.size} clients)`);

            return res.status(200).json({
                success: true,
                message: `Event '${event}' emitted successfully to room ${roomName}`,
                emittedTo: userId,
                roomSize: room.size
            });
        } else {
            // Broadcast to all connected clients
            const clientCount = io.sockets.sockets.size;
            io.emit(event, data);
          
            return res.status(200).json({
                success: true,
                message: `Event '${event}' emitted to all clients`,
                clientCount
            });
        }


       

    } catch (error: any) {

        console.error('❌ Error emitting event:', error);
        return res.status(500).json({
            success: false,
            message: "Failed to emit event",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

// Add debug endpoint
app.get("/debug/rooms", (req, res) => {
    if (!io) {
        return res.status(503).json({
            success: false,
            message: "Socket not initialized"
        });
    }

    const rooms: any = {};
    const allRooms = io.sockets.adapter.rooms;
    
    for (const [roomName, roomSet] of allRooms) {
        // Skip default socket rooms (they start with socket id)
        if (roomName && !roomName.startsWith('/') && roomName !== 'undefined') {
            rooms[roomName] = {
                size: roomSet.size,
                sockets: Array.from(roomSet)
            };
        }
    }

    res.json({
        totalSockets: io.sockets.sockets.size,
        totalRooms: allRooms.size,
        rooms: rooms,
        socketIds: Array.from(io.sockets.sockets.keys())
    });
});

// Add a test endpoint
app.post("/test/join", async (req, res) => {
    try {
        const { roomId } = req.body;
        if (!roomId) {
            return res.status(400).json({ error: "roomId required" });
        }

        // This is just for testing - it will create a room without a socket
        // Useful for debugging
        const room = io.sockets.adapter.rooms.get(roomId.toString());
        
        res.json({
            roomId,
            exists: !!room,
            size: room?.size || 0,
            users: room ? Array.from(room) : []
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});


/**
 * HEALTH
 */
app.get("/health", (req, res) => {
    res.status(200).json({
        status: "healthy",
        service: "socket-service",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
    });
});


/**
 * 404
 */
app.use((req, res) => {
    res.status(404).json({
        status: 404,
        message: "Requested socket-related resource not found",
    });
});

/**
 * GLOBAL ERROR HANDLER
 */
app.use((err: any, req: any, res: any, next: any) => {
    console.error("Socket Service Error:", {
        message: err.message,
        stack: err.stack,
    });

    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal Server Error in Socket Service",
        error: process.env.NODE_ENV === "development" ? err : {},
    });
});

export default app;


