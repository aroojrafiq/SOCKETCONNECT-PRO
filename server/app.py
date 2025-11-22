# import threading 
# import time
# from flask import Flask, request
# from flask_socketio import SocketIO, send, emit, join_room, leave_room

# app = Flask(__name__)
# app.config['SECRET_KEY'] = 'secret!'
# # Max buffer size = 10MB (Critical for binary streaming)
# socketio = SocketIO(app, cors_allowed_origins="*", max_http_buffer_size=10 * 1024 * 1024)

# # Data Store
# rooms = ['Global Group Chat'] 
# users = {}

# # --- THREADING MONITOR ---
# def monitor_server():
#     while True:
#         time.sleep(30)
#         print(f"\n[SERVER MONITOR]: {len(users)} users connected. Server Healthy.\n")

# @socketio.on('connect')
# def handle_connect():
#     print('New client connected')
#     emit('update_rooms', rooms)
#     emit('update_users', list(users.values()))

# @socketio.on('disconnect')
# def handle_disconnect():
#     if request.sid in users:
#         nickname = users.pop(request.sid)
#         emit('system_message', {'msg': f'{nickname} left.'}, broadcast=True)
#         emit('update_users', list(users.values()), broadcast=True)

# @socketio.on('register')
# def handle_register(nickname):
#     users[request.sid] = nickname
#     emit('system_message', {'msg': f'{nickname} joined.'}, broadcast=True)
#     emit('update_users', list(users.values()), broadcast=True)

# # --- CHAT & ROOMS ---
# @socketio.on('create_room')
# def handle_create_room(room_name):
#     if room_name not in rooms:
#         rooms.append(room_name)
#         emit('update_rooms', rooms, broadcast=True)

# @socketio.on('join_room_event')
# def handle_join_room(data):
#     join_room(data['room'])
#     emit('system_message', {'msg': f"{data['username']} joined {data['room']}."}, room=data['room'])

# @socketio.on('delete_room')
# def handle_delete_room(data):
#     if data['password'] == "admin":
#         if data['room_name'] in rooms and data['room_name'] != 'Global Group Chat':
#             rooms.remove(data['room_name'])
#             emit('update_rooms', rooms, broadcast=True)
#             emit('delete_success', {}, room=request.sid)
#     else:
#         emit('system_message', {'msg': '❌ Incorrect Admin Password!'}, room=request.sid)

# @socketio.on('private_message')
# def handle_private_message(data):
#     recipient_sid = next((sid for sid, name in users.items() if name == data['recipient']), None)
#     if recipient_sid:
#         payload = {'user': data['sender'], 'msg': data['msg'], 'isPrivate': True}
#         emit('message', payload, room=recipient_sid)
#         emit('message', payload, room=request.sid)

# @socketio.on('group_message')
# def handle_group_message(data):
#     room = data.get('room', 'Global Group Chat')
#     if room == 'Global Group Chat':
#         emit('message', {'user': users.get(request.sid), 'msg': data['msg'], 'isPrivate': False}, broadcast=True)
#     else:
#         emit('message', {'user': users.get(request.sid), 'msg': data['msg'], 'isPrivate': False}, room=room)

# @socketio.on('file_message')
# def handle_file_message(data):
#     recipient_sid = next((sid for sid, name in users.items() if name == data.get('recipient')), None)
#     payload = {'user': users.get(request.sid), 'msg': data['fileName'], 'file': data['file'], 'fileType': data['type'], 'isPrivate': False}
#     if recipient_sid:
#         payload['isPrivate'] = True
#         emit('message', payload, room=recipient_sid)
#         emit('message', payload, room=request.sid)
#     else:
#         emit('message', payload, broadcast=True)

# # --- BINARY STREAMING HANDLERS ---
# @socketio.on('call_request')
# def handle_call_request(data):
#     recipient_sid = next((sid for sid, name in users.items() if name == data['recipient']), None)
#     if recipient_sid:
#         emit('incoming_call', data, room=recipient_sid)

# @socketio.on('call_response')
# def handle_call_response(data):
#     sender_sid = next((sid for sid, name in users.items() if name == data['caller']), None)
#     if sender_sid:
#         emit('call_accepted', data, room=sender_sid)

# @socketio.on('voice_data')
# def handle_voice_data(data):
#     target = data.get('target')
#     recipient_sid = next((sid for sid, name in users.items() if name == target), None)
#     if recipient_sid:
#         emit('receive_voice', data['audio'], room=recipient_sid)

# @socketio.on('video_data')
# def handle_video_data(data):
#     target = data.get('target')
#     recipient_sid = next((sid for sid, name in users.items() if name == target), None)
#     if recipient_sid:
#         emit('receive_video', data['frame'], room=recipient_sid)

# if __name__ == '__main__':
#     print("✅ Server Running on http://0.0.0.0:5000")
#     t = threading.Thread(target=monitor_server)
#     t.daemon = True
#     t.start()
#     socketio.run(app, host='0.0.0.0', port=5000)



# back up code 
import threading 
import time
from flask import Flask, request
from flask_socketio import SocketIO, send, emit, join_room, leave_room

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, cors_allowed_origins="*", max_http_buffer_size=10 * 1024 * 1024)

rooms = ['Global Group Chat'] 
users = {}

def monitor_server():
    while True:
        time.sleep(30)
        print(f"[SERVER]: {len(users)} users connected.")

@socketio.on('connect')
def handle_connect():
    print('New client connected')
    emit('update_rooms', rooms)
    emit('update_users', list(users.values()))

@socketio.on('disconnect')
def handle_disconnect():
    if request.sid in users:
        nickname = users.pop(request.sid)
        emit('system_message', {'msg': f'{nickname} left.'}, broadcast=True)
        emit('update_users', list(users.values()), broadcast=True)

@socketio.on('register')
def handle_register(nickname):
    users[request.sid] = nickname
    emit('system_message', {'msg': f'{nickname} joined.'}, broadcast=True)
    emit('update_users', list(users.values()), broadcast=True)

# --- CHAT & ROOMS ---
@socketio.on('create_room')
def handle_create_room(room_name):
    if room_name not in rooms:
        rooms.append(room_name)
        emit('update_rooms', rooms, broadcast=True)

@socketio.on('join_room_event')
def handle_join_room(data):
    join_room(data['room'])
    emit('system_message', {'msg': f"{data['username']} joined {data['room']}."}, room=data['room'])

@socketio.on('delete_room')
def handle_delete_room(data):
    if data['password'] == "admin":
        if data['room_name'] in rooms and data['room_name'] != 'Global Group Chat':
            rooms.remove(data['room_name'])
            emit('update_rooms', rooms, broadcast=True)
            emit('delete_success', {}, room=request.sid)
    else:
        emit('system_message', {'msg': '❌ Incorrect Admin Password!'}, room=request.sid)

@socketio.on('private_message')
def handle_private_message(data):
    recipient_sid = next((sid for sid, name in users.items() if name == data['recipient']), None)
    if recipient_sid:
        # Standard Message
        payload = {'user': data['sender'], 'msg': data['msg'], 'isPrivate': True}
        emit('message', payload, room=recipient_sid)
        emit('message', payload, room=request.sid)

@socketio.on('call_log_message')
def handle_call_log_message(data):
    """Special handler to insert 'Call Ended' logs into chat"""
    recipient_sid = next((sid for sid, name in users.items() if name == data['recipient']), None)
    if recipient_sid:
        # Note: We send this as a 'system' type message so it looks distinct
        payload = {'user': 'System', 'msg': data['msg'], 'isPrivate': True, 'isSystem': True}
        emit('message', payload, room=recipient_sid)
        emit('message', payload, room=request.sid)

@socketio.on('group_message')
def handle_group_message(data):
    room = data.get('room', 'Global Group Chat')
    sender = users.get(request.sid, "Anonymous")
    if room == 'Global Group Chat':
        emit('message', {'user': sender, 'msg': data['msg'], 'isPrivate': False}, broadcast=True)
    else:
        emit('message', {'user': sender, 'msg': data['msg'], 'isPrivate': False}, room=room)

@socketio.on('file_message')
def handle_file_message(data):
    recipient_sid = next((sid for sid, name in users.items() if name == data.get('recipient')), None)
    payload = {'user': users.get(request.sid), 'msg': data['fileName'], 'file': data['file'], 'fileType': data['type'], 'isPrivate': False}
    if recipient_sid:
        payload['isPrivate'] = True
        emit('message', payload, room=recipient_sid)
        emit('message', payload, room=request.sid)
    else:
        emit('message', payload, broadcast=True)

# --- CALLING ---
@socketio.on('call_request')
def handle_call_request(data):
    recipient_sid = next((sid for sid, name in users.items() if name == data['recipient']), None)
    if recipient_sid:
        emit('incoming_call', data, room=recipient_sid)

@socketio.on('call_response')
def handle_call_response(data):
    sender_sid = next((sid for sid, name in users.items() if name == data['caller']), None)
    if sender_sid:
        emit('call_accepted', data, room=sender_sid)

@socketio.on('end_call') # <--- SYNC CALL TERMINATION
def handle_end_call(data):
    target = data.get('target')
    recipient_sid = next((sid for sid, name in users.items() if name == target), None)
    if recipient_sid:
        emit('call_ended', {'from': users.get(request.sid)}, room=recipient_sid)

@socketio.on('voice_data')
def handle_voice_data(data):
    target = data.get('target')
    recipient_sid = next((sid for sid, name in users.items() if name == target), None)
    if recipient_sid:
        emit('receive_voice', data['audio'], room=recipient_sid)

@socketio.on('video_data')
def handle_video_data(data):
    target = data.get('target')
    recipient_sid = next((sid for sid, name in users.items() if name == target), None)
    if recipient_sid:
        emit('receive_video', data['frame'], room=recipient_sid)

if __name__ == '__main__':
    print("✅ Server Running on http://0.0.0.0:5000")
    t = threading.Thread(target=monitor_server)
    t.daemon = True
    t.start()
    socketio.run(app, host='0.0.0.0', port=5000)