// import React, { useState, useEffect, useRef, useCallback } from 'react';
// import io from 'socket.io-client';
// import { ToastContainer, toast } from 'react-toastify';
// import 'react-toastify/dist/ReactToastify.css';
// import './App.css';

// // --- 1. CONNECT TO SERVER (WebSockets Forced) ---
// // Replace 'localhost' with '192.168.x.x' if testing on phone
// const socket = io.connect("http://localhost:5000", {
//   transports: ["websocket"],
//   upgrade: false
// });

// // --- UTILITY: Float32 to Int16 PCM ---
// const floatTo16BitPCM = (float32Array) => {
//   const buffer = new ArrayBuffer(float32Array.length * 2);
//   const view = new DataView(buffer);
//   for (let i = 0; i < float32Array.length; i++) {
//     let s = Math.max(-1, Math.min(1, float32Array[i]));
//     view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
//   }
//   return buffer;
// };

// function App() {
//   // --- STATES ---
//   const [nickname, setNickname] = useState("");
//   const [isLoggedIn, setIsLoggedIn] = useState(false);
//   const [message, setMessage] = useState("");
//   const [chat, setChat] = useState([]);
//   const [activeUsers, setActiveUsers] = useState([]);
//   const [recipient, setRecipient] = useState(null); 
//   const [rooms, setRooms] = useState([]); 
//   const [currentRoom, setCurrentRoom] = useState("Global Group Chat");

//   // Modals
//   const [showJoinModal, setShowJoinModal] = useState(false);
//   const [showCreateModal, setShowCreateModal] = useState(false);
//   const [showDeleteModal, setShowDeleteModal] = useState(false);
//   const [pendingRoom, setPendingRoom] = useState(null);
//   const [newRoomName, setNewRoomName] = useState("");
//   const [adminPassword, setAdminPassword] = useState("");

//   // Call States
//   const [isInCall, setIsInCall] = useState(false);
//   const [isIncomingCall, setIsIncomingCall] = useState(false);
//   const [callSender, setCallSender] = useState(null); 
//   const [callType, setCallType] = useState(null); 
//   const [remoteStreamUrl, setRemoteStreamUrl] = useState(null);

//   // Refs
//   const myVideoRef = useRef(null); 
//   const canvasRef = useRef(null);  
//   const chatEndRef = useRef(null);
//   const audioContextRef = useRef(null); 
//   const captureContextRef = useRef(null); 
//   const processorRef = useRef(null);
//   const localStreamRef = useRef(null);
//   const videoIntervalRef = useRef(null);

//   // --- CLEANUP ---
//   const endCallCleanup = useCallback(() => {
//       setIsInCall(false);
//       setRemoteStreamUrl(null);
//       if(videoIntervalRef.current) clearInterval(videoIntervalRef.current);
//       if(processorRef.current) { processorRef.current.disconnect(); processorRef.current = null; }
//       if(captureContextRef.current) { captureContextRef.current.close(); captureContextRef.current = null; }
//       if(localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null; }
//   }, []);

//   // --- STREAMING LOGIC (ONE-WAY FALLBACK) ---
//   const beginStreaming = useCallback(async () => {
//       let stream = null;
//       let activeType = callType; 

//       try {
//           try {
//               // Try getting Video + Audio
//               stream = await navigator.mediaDevices.getUserMedia({ 
//                   audio: true, 
//                   video: callType === 'video' ? { width: 300, height: 225 } : false 
//               });
//           } catch (err) {
//               // Fallback: Camera busy? Try Audio Only
//               if (callType === 'video') {
//                   toast.warn("Camera busy! Switching to Voice Mode 🎤");
//                   activeType = 'voice';
//                   stream = await navigator.mediaDevices.getUserMedia({ audio: true });
//               } else {
//                   throw err;
//               }
//           }
          
//           localStreamRef.current = stream;

//           // Audio Setup (Raw PCM)
//           const ctx = new (window.AudioContext || window.webkitAudioContext)();
//           captureContextRef.current = ctx;
//           const source = ctx.createMediaStreamSource(stream);
//           const processor = ctx.createScriptProcessor(4096, 1, 1);
//           processorRef.current = processor;

//           processor.onaudioprocess = (e) => {
//               const inputData = e.inputBuffer.getChannelData(0); 
//               const pcm16 = floatTo16BitPCM(inputData); 
//               socket.emit('voice_data', { target: recipient || callSender, audio: pcm16 });
//           };

//           source.connect(processor);
//           processor.connect(ctx.destination); 

//           // Video Setup (MJPEG) - Only if video mode active
//           if (activeType === 'video') {
//               if (myVideoRef.current) {
//                   myVideoRef.current.srcObject = stream;
//                   // Force Play to prevent black screen
//                   await myVideoRef.current.play().catch(e => console.error("Auto-play", e));
//               }
              
//               videoIntervalRef.current = setInterval(() => {
//                   if (myVideoRef.current && canvasRef.current) {
//                       const c = canvasRef.current.getContext('2d');
//                       c.drawImage(myVideoRef.current, 0, 0, 300, 225);
//                       canvasRef.current.toBlob(blob => {
//                           if(blob) socket.emit('video_data', { target: recipient || callSender, frame: blob });
//                       }, 'image/jpeg', 0.6);
//                   }
//               }, 100); 
//           }

//       } catch (err) {
//           console.error("Media Error:", err);
//           toast.error(`Device Error: ${err.name}`);
//           endCallCleanup();
//       }
//   }, [callType, recipient, callSender, endCallCleanup]);

//   useEffect(() => {
//     const handleMessage = (p) => setChat(prev => [...prev, p]);
//     const handleSystem = (p) => setChat(prev => [...prev, { user: "System", msg: p.msg, isSystem: true }]);
//     const handleUsers = (u) => setActiveUsers(u.filter(user => user !== nickname));
//     const handleRooms = (r) => setRooms(r);
//     const handleDelete = () => { 
//         toast.success("Room deleted!"); setShowDeleteModal(false); setAdminPassword("");
//         if(pendingRoom === currentRoom) setCurrentRoom("Global Group Chat"); 
//     };

//     const handleIncoming = (data) => {
//         if(!isInCall && !isIncomingCall) {
//             setIsIncomingCall(true);
//             setCallSender(data.sender);
//             setCallType(data.callType);
//             toast.info(`📞 Incoming ${data.callType} call from ${data.sender}`);
//         }
//     };

//     const handleAccepted = (data) => {
//         if(data.accepted) {
//             toast.success("Connected!");
//             beginStreaming(); 
//         } else {
//             toast.error("Rejected");
//             endCallCleanup();
//         }
//     };

//     const handleVoiceData = (arrayBuffer) => {
//         try {
//             if (!audioContextRef.current) {
//                 audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
//             }
//             const ctx = audioContextRef.current;
//             const dataView = new DataView(arrayBuffer);
//             const float32 = new Float32Array(arrayBuffer.byteLength / 2);
//             for(let i=0; i < float32.length; i++) {
//                 const int16 = dataView.getInt16(i * 2, true);
//                 float32[i] = int16 / 32768;
//             }
//             const audioBuffer = ctx.createBuffer(1, float32.length, ctx.sampleRate);
//             audioBuffer.getChannelData(0).set(float32);
//             const source = ctx.createBufferSource();
//             source.buffer = audioBuffer;
//             source.connect(ctx.destination);
//             source.start();
//         } catch(e) { console.error("Audio Play Error", e); }
//     };

//     const handleVideoData = (blob) => {
//         const url = URL.createObjectURL(new Blob([blob]));
//         setRemoteStreamUrl(url);
//     };

//     socket.on("message", handleMessage);
//     socket.on("system_message", handleSystem);
//     socket.on("update_users", handleUsers);
//     socket.on("update_rooms", handleRooms);
//     socket.on("delete_success", handleDelete);
//     socket.on("incoming_call", handleIncoming);
//     socket.on("call_accepted", handleAccepted);
//     socket.on("receive_video", handleVideoData);
//     socket.on("receive_voice", handleVoiceData);

//     return () => {
//         socket.off("message"); socket.off("system_message"); socket.off("update_users"); 
//         socket.off("update_rooms"); socket.off("delete_success"); socket.off("incoming_call");
//         socket.off("call_accepted"); socket.off("receive_video"); socket.off("receive_voice");
//     };
//   }, [nickname, isInCall, isIncomingCall, pendingRoom, currentRoom, beginStreaming, endCallCleanup]);

//   useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);

//   // --- UI FUNCTIONS ---
//   const joinChat = () => { if(nickname){socket.emit("register",nickname);setIsLoggedIn(true);toast.success(`Welcome ${nickname}`);} else toast.warn("Enter nickname"); };
//   const sendMessage = (e) => { e.preventDefault(); if(message){ const p={msg:message, sender:nickname}; if(recipient) { p.recipient=recipient; socket.emit("private_message",p); } else { p.room=currentRoom; socket.emit("group_message",p); } setMessage(""); }};
//   const sendFile = (e) => { const f=e.target.files[0]; if(!f || f.size>10*1024*1024) { return toast.error("File > 10MB"); } toast.info("Uploading..."); const r=new FileReader(); r.readAsDataURL(f); r.onload=()=> { socket.emit("file_message",{file:r.result, fileName:f.name, type:f.type, recipient:recipient}); toast.success("Sent!"); }; };

//   const openCreateModal = () => { setNewRoomName(""); setShowCreateModal(true); };
//   const confirmCreateRoom = () => { if(newRoomName.trim()){ socket.emit("create_room",newRoomName); toast.success("Created!"); setShowCreateModal(false); }};
//   const handleDeleteClick = (r,e) => { e.stopPropagation(); setPendingRoom(r); setAdminPassword(""); setShowDeleteModal(true); };
//   const confirmDeleteRoom = () => { if(!adminPassword) return toast.error("Password required"); socket.emit("delete_room", {room_name:pendingRoom, password:adminPassword}); };
  
//   const handleRoomClick = (r) => { 
//       if(r === "Global Group Chat") {
//           setRecipient(null);
//           setCurrentRoom("Global Group Chat");
//       } else if(r!==currentRoom){ 
//           setPendingRoom(r); 
//           setShowJoinModal(true); 
//       }
//   };
  
//   const confirmJoinRoom = () => { setRecipient(null); setCurrentRoom(pendingRoom); socket.emit("join_room_event", {username:nickname, room:pendingRoom}); setShowJoinModal(false); };

//   const startCall = (type) => { if(!recipient) return toast.error("Select user!"); setCallType(type); setIsInCall(true); socket.emit('call_request', { sender: nickname, recipient: recipient, callType: type }); toast.info(`Calling ${recipient}...`); };
//   const answerCall = () => { setIsIncomingCall(false); setIsInCall(true); setRecipient(callSender); socket.emit('call_response', { caller: callSender, accepted: true }); beginStreaming(); };
//   const rejectCall = () => { setIsIncomingCall(false); socket.emit('call_response', { caller: callSender, accepted: false }); };

//   if (!isLoggedIn) {
//     return (
//       <div className="landing-page">
//         <ToastContainer position="top-center" theme="dark" /> 
//         <nav className="navbar"><div className="logo">SocketConnect Pro</div></nav>
//         <header className="hero"><div className="hero-content"><h1>Connect instantly.</h1><div className="hero-login-box"><input onChange={e=>setNickname(e.target.value)} placeholder="Nickname..." onKeyPress={e=>e.key==='Enter'&&joinChat()}/><button onClick={joinChat}>Start 🚀</button></div></div></header>
//       </div>
//     );
//   }

//   return (
//     <div className="App">
//       <ToastContainer position="bottom-right" theme="colored" autoClose={3000} />
//       <video ref={myVideoRef} autoPlay muted playsInline style={{position:'absolute', opacity:0, pointerEvents:'none', zIndex:-1}} />
//       <canvas ref={canvasRef} width="300" height="225" style={{display:'none'}} />

//       {/* Modals */}
//       {showJoinModal && <div className="modal-overlay"><div className="modal-glass"><h3>Join Room?</h3><p>{pendingRoom}</p><div className="modal-actions"><button className="btn-cancel" onClick={()=>setShowJoinModal(false)}>Cancel</button><button className="btn-confirm" onClick={confirmJoinRoom}>Yes</button></div></div></div>}
//       {showCreateModal && <div className="modal-overlay"><div className="modal-glass"><h3>Create Room</h3><input className="modal-input" onChange={e=>setNewRoomName(e.target.value)} placeholder="Name..."/><div className="modal-actions"><button className="btn-cancel" onClick={()=>setShowCreateModal(false)}>Cancel</button><button className="btn-confirm" onClick={confirmCreateRoom}>Create</button></div></div></div>}
//       {showDeleteModal && <div className="modal-overlay"><div className="modal-glass"><h3 style={{color:'red'}}>Delete?</h3><p>{pendingRoom}</p><input type="password" className="modal-input" placeholder="Admin Password" onChange={e=>setAdminPassword(e.target.value)}/><div className="modal-actions"><button className="btn-cancel" onClick={()=>setShowDeleteModal(false)}>Cancel</button><button className="btn-confirm" style={{background:'red'}} onClick={confirmDeleteRoom}>Delete</button></div></div></div>}

//       {/* Incoming Call */}
//       {isIncomingCall && <div className="modal-overlay"><div className="modal-glass video-call-modal"><h3>📞 Incoming {callType} Call</h3><p>From: {callSender}</p><div className="modal-actions"><button className="btn-cancel" style={{background:'red'}} onClick={rejectCall}>Decline</button><button className="btn-confirm" style={{background:'green'}} onClick={answerCall}>Answer</button></div></div></div>}

//       {/* Active Call */}
//       {isInCall && (
//         <div className="modal-overlay"><div className="modal-glass video-call-modal"><h3 style={{color:callType==='voice'?'#00a884':'#d32f2f'}}>{callType==='voice'?"🎙️ Voice Call":"🔴 Video Call"} Active</h3>
//         <div className="video-container">{callType==='video'?(<div className="video-box">{remoteStreamUrl?<img src={remoteStreamUrl} className="live-video-feed" alt="Stream"/>:<div className="spinner">Connecting...</div>}</div>):(<div className="voice-visualizer"><div className="pulse-ring"></div><span style={{fontSize:'3rem'}}>👤</span></div>)}</div>
//         <button className="btn-cancel" style={{background:'red', width:'100%', marginTop:'20px'}} onClick={endCallCleanup}>End Call</button></div></div>
//       )}

//       {/* SIDEBAR UI (Corrected) */}
//       <div className="sidebar">
//           {/* Home Section */}
//           <h3>Home</h3>
//           <ul>
//               <li onClick={() => handleRoomClick("Global Group Chat")} className={currentRoom === "Global Group Chat" && !recipient ? "active-user" : ""}>
//                   🌐 Global Group Chat
//               </li>
//           </ul>

//           {/* Rooms Section */}
//           <div style={{display:'flex',justifyContent:'space-between',paddingRight:'15px', marginTop:'20px'}}><h3>Chat Rooms</h3><button onClick={openCreateModal} className="add-room-btn">➕</button></div>
//           <ul>
//               {rooms.map((r,i)=>(
//                   r!=="Global Group Chat" && 
//                   <li key={i} style={{display:'flex',justifyContent:'space-between'}} onClick={()=>handleRoomClick(r)} className={currentRoom===r&&!recipient?"active-user":""}>
//                       <span>📢 {r}</span>
//                       <span className="delete-icon" onClick={(e)=>handleDeleteClick(r,e)}>🗑️</span>
//                   </li>
//               ))}
//           </ul>

//           {/* Users Section */}
//           <h3 style={{marginTop:'20px'}}>Active Users</h3>
//           <ul>{activeUsers.map((u,i)=><li key={i} onClick={()=>setRecipient(u)} className={recipient===u?"active-user":""}>👤 {u}</li>)}</ul>
//       </div>

//       {/* Chat Window */}
//       <div className="chat-window">
//         <div className="chat-header" style={{display:'flex',justifyContent:'space-between', alignItems:'center'}}><h3>{recipient?`Private: ${recipient}`:currentRoom}</h3>
//         {recipient&&(<div style={{display:'flex',gap:'10px'}}><button className="call-btn voice" onClick={()=>startCall('voice')}>📞 Voice</button><button className="call-btn video" onClick={()=>startCall('video')}>📹 Video</button></div>)}</div>
        
//         <div className="chat-body">
//             {chat.map((payload,index)=>{ 
//                 if(recipient){if(!payload.isPrivate)return null; if(payload.user!==nickname&&payload.user!==recipient)return null;} 
//                 else{if(payload.isPrivate)return null;} 
//                 return ( 
//                     <div key={index} className={`message ${payload.user===nickname?"my-message":"other-message"} ${payload.isSystem?"system-message":""}`}> 
//                         {!payload.isSystem&&<span className="msg-meta">{payload.user}</span>} 
//                         {payload.file ? (
//                             payload.fileType.startsWith("image/") ? <img src={payload.file} alt="shared" style={{maxWidth:"200px", borderRadius:"5px"}}/> :
//                             <a href={payload.file} download={payload.msg} style={{color:"#00a884", textDecoration:"none", fontWeight:"bold"}}>📄 {payload.msg}</a>
//                         ) : <p className="msg-content">{payload.msg}</p>} 
//                     </div> 
//                 ); 
//             })}
//             <div ref={chatEndRef}/>
//         </div>
        
//         <div className="chat-footer">
//             <label htmlFor="file-upload" style={{cursor:"pointer", fontSize:"20px", marginRight:"10px"}} title="Send File">📎</label>
//             <input id="file-upload" type="file" style={{display:"none"}} onChange={sendFile} />
//             <form onSubmit={sendMessage}><input onChange={e=>setMessage(e.target.value)} value={message} placeholder="Message..." /><button>Send</button></form>
//         </div>
//       </div>
//     </div>
//   );
// }
// export default App;
// back up
import React, { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

// 1. Connect to Socket (WebSockets forced to prevent "Too many packets")
// REPLACE 'localhost' with your IP (e.g. http://192.168.1.18:5000) if testing on phone.
const socket = io.connect("http://localhost:5000", {
  transports: ["websocket"],
  upgrade: false
});

// --- UTILITY: Float32 to Int16 PCM ---
const floatTo16BitPCM = (float32Array) => {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32Array.length; i++) {
    let s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return buffer;
};

// --- UTILITY: Time Formatter ---
const formatTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

function App() {
  // --- USER & CHAT STATES ---
  const [nickname, setNickname] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);
  const [recipient, setRecipient] = useState(null); 
  const [rooms, setRooms] = useState([]); 
  const [currentRoom, setCurrentRoom] = useState("Global Group Chat");

  // --- ADMIN & MODALS ---
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingRoom, setPendingRoom] = useState(null);
  const [newRoomName, setNewRoomName] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  // --- CALLING STATES ---
  const [isInCall, setIsInCall] = useState(false);
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [isCallAccepted, setIsCallAccepted] = useState(false); // <--- NEW: Tracks if call picked up
  const [callSender, setCallSender] = useState(null); 
  const [callType, setCallType] = useState(null); 
  const [remoteStreamUrl, setRemoteStreamUrl] = useState(null);
  const [callSeconds, setCallSeconds] = useState(0);

  // --- REFS ---
  const myVideoRef = useRef(null); 
  const canvasRef = useRef(null);  
  const chatEndRef = useRef(null);
  const audioContextRef = useRef(null); 
  const captureContextRef = useRef(null); 
  const processorRef = useRef(null);
  const localStreamRef = useRef(null);
  const videoIntervalRef = useRef(null);
  const callStartTimeRef = useRef(null); 

  // --- TIMER LOGIC (Only runs if Call is Accepted) ---
  useEffect(() => {
      let interval = null;
      if (isInCall && isCallAccepted) {
          // Start Timer only when call is accepted
          if (!callStartTimeRef.current) callStartTimeRef.current = Date.now();
          
          interval = setInterval(() => {
              setCallSeconds((prev) => prev + 1);
          }, 1000);
      } else {
          clearInterval(interval);
      }
      return () => clearInterval(interval);
  }, [isInCall, isCallAccepted]);

  // --- CLEANUP ---
  const endCallCleanup = useCallback(() => {
      setIsInCall(false);
      setIsCallAccepted(false); // Reset status
      setRemoteStreamUrl(null);
      setCallType(null);
      setCallSeconds(0);
      callStartTimeRef.current = null;

      if(videoIntervalRef.current) clearInterval(videoIntervalRef.current);
      
      if(processorRef.current) { processorRef.current.disconnect(); processorRef.current = null; }
      if(captureContextRef.current) { captureContextRef.current.close(); captureContextRef.current = null; }
      if(localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null; }
  }, []);

  // --- STREAMING LOGIC (Safe One-Way Fallback) ---
  const beginStreaming = useCallback(async () => {
      let stream = null;
      let activeType = callType; 

      try {
          try {
              // Try Video + Audio
              stream = await navigator.mediaDevices.getUserMedia({ 
                  audio: true, 
                  video: callType === 'video' ? { width: 300, height: 225 } : false 
              });
          } catch (err) {
              // Fallback: Camera busy? Try Audio Only
              if (callType === 'video') {
                  toast.warn("Camera busy! Switching to Voice Mode 🎤");
                  activeType = 'voice';
                  stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              } else {
                  throw err;
              }
          }
          
          localStreamRef.current = stream;

          // Audio Setup (PCM)
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          captureContextRef.current = ctx;
          const source = ctx.createMediaStreamSource(stream);
          const processor = ctx.createScriptProcessor(4096, 1, 1);
          processorRef.current = processor;

          processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0); 
              const pcm16 = floatTo16BitPCM(inputData); 
              socket.emit('voice_data', { target: recipient || callSender, audio: pcm16 });
          };

          source.connect(processor);
          processor.connect(ctx.destination); 

          // Video Setup (MJPEG)
          if (activeType === 'video') {
              if (myVideoRef.current) {
                  myVideoRef.current.srcObject = stream;
                  await myVideoRef.current.play().catch(e => console.error("Autoplay", e));
              }
              
              videoIntervalRef.current = setInterval(() => {
                  if (myVideoRef.current && canvasRef.current) {
                      const c = canvasRef.current.getContext('2d');
                      c.drawImage(myVideoRef.current, 0, 0, 300, 225);
                      canvasRef.current.toBlob(blob => {
                          if(blob) socket.emit('video_data', { target: recipient || callSender, frame: blob });
                      }, 'image/jpeg', 0.6);
                  }
              }, 100); 
          }

      } catch (err) {
          console.error("Media Error:", err);
          toast.error(`Device Error: ${err.name}`);
          endCallCleanup();
      }
  }, [callType, recipient, callSender, endCallCleanup]);

  // --- SOCKET LISTENERS ---
  useEffect(() => {
    const handleMessage = (p) => setChat(prev => [...prev, p]);
    const handleSystem = (p) => setChat(prev => [...prev, { user: "System", msg: p.msg, isSystem: true }]);
    const handleUsers = (u) => setActiveUsers(u.filter(user => user !== nickname));
    const handleRooms = (r) => setRooms(r);
    const handleDelete = () => { toast.success("Room deleted!"); setShowDeleteModal(false); setAdminPassword(""); if(pendingRoom===currentRoom) setCurrentRoom("Global Group Chat"); };

    const handleIncoming = (data) => {
        if(!isInCall && !isIncomingCall) {
            setIsIncomingCall(true);
            setCallSender(data.sender);
            setCallType(data.callType);
            toast.info(`📞 Incoming ${data.callType} call from ${data.sender}`);
        }
    };

    const handleAccepted = (data) => {
        if(data.accepted) {
            toast.success("Call Connected!");
            setIsCallAccepted(true); // <--- START TIMER NOW
            beginStreaming(); 
        } else {
            toast.error("Call Rejected");
            endCallCleanup();
        }
    };

    const handleRemoteEnd = (data) => {
        toast.info(`Call ended by ${data.from}`);
        endCallCleanup();
    };

    const handleVoiceData = (arrayBuffer) => {
        try {
            if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            const ctx = audioContextRef.current;
            const dataView = new DataView(arrayBuffer);
            const float32 = new Float32Array(arrayBuffer.byteLength / 2);
            for(let i=0; i < float32.length; i++) float32[i] = dataView.getInt16(i * 2, true) / 32768;
            const audioBuffer = ctx.createBuffer(1, float32.length, ctx.sampleRate);
            audioBuffer.getChannelData(0).set(float32);
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);
            source.start();
        } catch(e) { console.error("Audio Error", e); }
    };

    const handleVideoData = (blob) => {
        const url = URL.createObjectURL(new Blob([blob]));
        setRemoteStreamUrl(url);
    };

    socket.on("message", handleMessage);
    socket.on("system_message", handleSystem);
    socket.on("update_users", handleUsers);
    socket.on("update_rooms", handleRooms);
    socket.on("delete_success", handleDelete);
    socket.on("incoming_call", handleIncoming);
    socket.on("call_accepted", handleAccepted);
    socket.on("receive_video", handleVideoData);
    socket.on("receive_voice", handleVoiceData);
    socket.on("call_ended", handleRemoteEnd);

    return () => {
        socket.off("message"); socket.off("system_message"); socket.off("update_users"); 
        socket.off("update_rooms"); socket.off("delete_success"); socket.off("incoming_call");
        socket.off("call_accepted"); socket.off("receive_video"); socket.off("receive_voice");
        socket.off("call_ended");
    };
  }, [nickname, isInCall, isIncomingCall, pendingRoom, currentRoom, beginStreaming, endCallCleanup]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);

  // --- UI FUNCTIONS ---
  const joinChat = () => { if(nickname){socket.emit("register",nickname);setIsLoggedIn(true);toast.success(`Welcome ${nickname}`);} else toast.warn("Enter nickname"); };
  const sendMessage = (e) => { e.preventDefault(); if(message){ const p={msg:message, sender:nickname}; if(recipient) { p.recipient=recipient; socket.emit("private_message",p); } else { p.room=currentRoom; socket.emit("group_message",p); } setMessage(""); }};
  const sendFile = (e) => { const f=e.target.files[0]; if(!f || f.size>10*1024*1024) { return toast.error("File > 10MB"); } toast.info("Uploading..."); const r=new FileReader(); r.readAsDataURL(f); r.onload=()=> { socket.emit("file_message",{file:r.result, fileName:f.name, type:f.type, recipient:recipient}); toast.success("Sent!"); }; };

  const openCreateModal = () => { setNewRoomName(""); setShowCreateModal(true); };
  const confirmCreateRoom = () => { if(newRoomName.trim()){ socket.emit("create_room",newRoomName); toast.success("Created!"); setShowCreateModal(false); }};
  const handleDeleteClick = (r,e) => { e.stopPropagation(); setPendingRoom(r); setAdminPassword(""); setShowDeleteModal(true); };
  const confirmDeleteRoom = () => { if(!adminPassword) return toast.error("Password required"); socket.emit("delete_room", {room_name:pendingRoom, password:adminPassword}); };
  
  const handleRoomClick = (r) => { 
      if(r === "Global Group Chat") { setRecipient(null); setCurrentRoom("Global Group Chat"); } 
      else if(r!==currentRoom){ setPendingRoom(r); setShowJoinModal(true); }
  };
  
  const confirmJoinRoom = () => { setRecipient(null); setCurrentRoom(pendingRoom); socket.emit("join_room_event", {username:nickname, room:pendingRoom}); setShowJoinModal(false); };

  const startCall = (type) => { 
      if(!recipient) return toast.error("Select user!"); 
      setCallType(type); 
      setIsInCall(true); 
      setIsCallAccepted(false); // <--- Set "Ringing" state
      socket.emit('call_request', { sender: nickname, recipient: recipient, callType: type }); 
      toast.info(`Calling ${recipient}...`); 
  };

  const answerCall = () => { 
      setIsIncomingCall(false); 
      setIsInCall(true); 
      setIsCallAccepted(true); // <--- Accepted immediately
      setRecipient(callSender); 
      socket.emit('call_response', { caller: callSender, accepted: true }); 
      beginStreaming(); 
  };

  const rejectCall = () => { setIsIncomingCall(false); socket.emit('call_response', { caller: callSender, accepted: false }); };

  const endCall = () => {
      const durationStr = formatTime(callSeconds);
      const target = recipient || callSender;
      if (target && isCallAccepted) {
          const logMsg = `📞 ${callType==='video'?'Video':'Voice'} Call ended • Duration: ${durationStr}`;
          socket.emit('call_log_message', { recipient: target, msg: logMsg });
          socket.emit('end_call', { target: target }); 
      }
      endCallCleanup();
  };

  // --- RENDER: PROFESSIONAL LANDING PAGE (Restored) ---
  if (!isLoggedIn) {
    return (
      <div className="landing-page">
        <ToastContainer position="top-center" theme="dark" /> 
        <nav className="navbar">
          <div className="logo">SocketConnect Pro</div>
          <div className="nav-links"><a href="#features">Features</a><a href="#testimonials">Reviews</a><button className="nav-btn" onClick={() => document.getElementById('join-input').focus()}>Login</button></div>
        </nav>
        <header className="hero">
            <div className="hero-content">
                <span className="badge">🎉 Now available on Web</span>
                <h1>Connect with anyone, anywhere, instantly.</h1>
                <p>Experience seamless communication with ChatFlow. Send messages, share media, and stay connected with friends, family, and colleagues in real-time.</p>
                <div className="hero-login-box">
                    <input id="join-input" type="text" placeholder="Enter your Nickname..." onChange={(e) => setNickname(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && joinChat()}/>
                    <button onClick={joinChat}>Get Started Free 🚀</button>
                </div>
                <div className="hero-stats"><div className="stat"><strong>2M+</strong><small>Active Users</small></div><div className="stat"><strong>4.9★</strong><small>App Rating</small></div><div className="stat"><strong>150+</strong><small>Countries</small></div></div>
            </div>
        </header>
        <section id="features" className="features-section">
          <h2>Everything you need to stay connected</h2>
          <div className="features-grid">
            <div className="feature-card"><div className="icon">⚡</div><h3>Instant Messaging</h3><p>Real-time delivery.</p></div>
            <div className="feature-card"><div className="icon">🔒</div><h3>Encryption</h3><p>Your conversations are secure.</p></div>
            <div className="feature-card"><div className="icon">🎥</div><h3>Video & Voice</h3><p>Crystal-clear calls.</p></div>
            <div className="feature-card"><div className="icon">👥</div><h3>Group Chats</h3><p>Collaborate effortlessly.</p></div>
          </div>
        </section>
        <section id="testimonials" className="testimonials-section">
          <h2>Loved by millions worldwide</h2>
          <div className="testimonials-grid">
            <div className="review-card"><p>"ChatFlow has transformed how my team communicates."</p><h4>Sarah Johnson</h4></div>
            <div className="review-card"><p>"Love the simplicity and speed. Highly recommended!"</p><h4>Michael Chen</h4></div>
            <div className="review-card"><p>"The best messaging app I've used."</p><h4>Emily Rodriguez</h4></div>
          </div>
        </section>
        <footer className="footer"><p>© 2025 ChatFlow. All rights reserved.</p></footer>
      </div>
    );
  }

  // --- RENDER: MAIN APP ---
  return (
    <div className="App">
      <ToastContainer position="bottom-right" theme="colored" autoClose={3000} />
      <video ref={myVideoRef} autoPlay muted playsInline style={{position:'absolute', opacity:0, pointerEvents:'none', zIndex:-1}} />
      <canvas ref={canvasRef} width="300" height="225" style={{display:'none'}} />

      {/* Modals */}
      {showJoinModal && <div className="modal-overlay"><div className="modal-glass"><h3>Join Room?</h3><p>{pendingRoom}</p><div className="modal-actions"><button className="btn-cancel" onClick={()=>setShowJoinModal(false)}>Cancel</button><button className="btn-confirm" onClick={confirmJoinRoom}>Yes</button></div></div></div>}
      {showCreateModal && <div className="modal-overlay"><div className="modal-glass"><h3>Create Room</h3><input className="modal-input" onChange={e=>setNewRoomName(e.target.value)} placeholder="Name..."/><div className="modal-actions"><button className="btn-cancel" onClick={()=>setShowCreateModal(false)}>Cancel</button><button className="btn-confirm" onClick={confirmCreateRoom}>Create</button></div></div></div>}
      {showDeleteModal && <div className="modal-overlay"><div className="modal-glass"><h3 style={{color:'red'}}>Delete?</h3><p>{pendingRoom}</p><input type="password" className="modal-input" placeholder="Admin Password" onChange={e=>setAdminPassword(e.target.value)}/><div className="modal-actions"><button className="btn-cancel" onClick={()=>setShowDeleteModal(false)}>Cancel</button><button className="btn-confirm" style={{background:'red'}} onClick={confirmDeleteRoom}>Delete</button></div></div></div>}

      {/* Incoming Call */}
      {isIncomingCall && <div className="modal-overlay"><div className="modal-glass video-call-modal"><h3>📞 Incoming {callType} Call</h3><p>From: {callSender}</p><div className="modal-actions"><button className="btn-cancel" style={{background:'red'}} onClick={rejectCall}>Decline</button><button className="btn-confirm" style={{background:'green'}} onClick={answerCall}>Answer</button></div></div></div>}

      {/* Active Call */}
      {isInCall && (
        <div className="modal-overlay">
            <div className="modal-glass video-call-modal">
                <h3 style={{color:callType==='voice'?'#00a884':'#d32f2f'}}>{callType==='voice'?"🎙️ Voice Call":"🔴 Video Call"} Active</h3>
                
                {/* STATUS OR TIMER */}
                <p style={{fontSize:'1.2rem', fontWeight:'bold', margin:'10px 0'}}>
                    {isCallAccepted ? formatTime(callSeconds) : "Ringing..."}
                </p>
                
                <div className="video-container">
                    {callType==='video'?(
                        <div className="video-box">
                            {remoteStreamUrl?<img src={remoteStreamUrl} className="live-video-feed" alt="Stream"/>:<div className="spinner">Connecting...</div>}
                        </div>
                    ):(
                        <div className="voice-visualizer"><div className="pulse-ring"></div><span style={{fontSize:'3rem'}}>👤</span></div>
                    )}
                </div>
                <button className="btn-cancel" style={{background:'red', width:'100%', marginTop:'20px'}} onClick={endCall}>End Call</button>
            </div>
        </div>
      )}

      {/* Sidebar */}
      <div className="sidebar">
          <h3>Home</h3><ul><li onClick={()=>handleRoomClick("Global Group Chat")} className={currentRoom==="Global Group Chat"&&!recipient?"active-user":""}>🌐 Global Group Chat</li></ul>
          <div style={{display:'flex',justifyContent:'space-between',paddingRight:'15px', marginTop:'20px'}}><h3>Chat Rooms</h3><button onClick={openCreateModal} className="add-room-btn">➕</button></div>
          <ul>{rooms.map((r,i)=>(r!=="Global Group Chat" && <li key={i} style={{display:'flex',justifyContent:'space-between'}} onClick={()=>handleRoomClick(r)} className={currentRoom===r&&!recipient?"active-user":""}><span>📢 {r}</span><span className="delete-icon" onClick={(e)=>handleDeleteClick(r,e)}>🗑️</span></li>))}</ul>
          <h3 style={{marginTop:'20px'}}>Active Users</h3><ul>{activeUsers.map((u,i)=><li key={i} onClick={()=>setRecipient(u)} className={recipient===u?"active-user":""}>👤 {u}</li>)}</ul>
      </div>

      {/* Chat Window */}
      <div className="chat-window">
        <div className="chat-header" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><h3>{recipient?`Private: ${recipient}`:currentRoom}</h3>{recipient&&(<div style={{display:'flex',gap:'10px'}}><button className="call-btn voice" onClick={()=>startCall('voice')}>📞 Voice</button><button className="call-btn video" onClick={()=>startCall('video')}>📹 Video</button></div>)}</div>
        <div className="chat-body">{chat.map((payload,index)=>(<div key={index} className={`message ${payload.user===nickname?"my-message":"other-message"} ${payload.isSystem?"system-message":""}`}>{!payload.isSystem&&<span className="msg-meta">{payload.user}</span>}{payload.file?(payload.fileType.startsWith("image/")?<img src={payload.file} alt="shared" style={{maxWidth:"200px",borderRadius:"5px"}}/>:<a href={payload.file} download={payload.msg} style={{color:"#00a884",fontWeight:"bold"}}>📄 {payload.msg}</a>):<p className="msg-content">{payload.msg}</p>}</div>))}<div ref={chatEndRef}/></div>
        <div className="chat-footer"><label htmlFor="file-upload" style={{cursor:"pointer",fontSize:"20px",marginRight:"10px"}} title="Send File">📎</label><input id="file-upload" type="file" style={{display:"none"}} onChange={sendFile} /><form onSubmit={sendMessage}><input onChange={e=>setMessage(e.target.value)} value={message} placeholder="Message..." /><button>Send</button></form></div>
      </div>
    </div>
  );
}
export default App;