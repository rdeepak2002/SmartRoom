const express = require('express')
const nocache = require('nocache')
const path = require('path')
const http = require('http')
const admin = require('firebase-admin')
const serviceAccount = require('./vr-classroom-214b2-firebase-adminsdk-ear0m-9532b6513d.json')

let app = express()
let server = http.Server(app)
let io = require('socket.io')(server)
let port = process.env.PORT || 8080

app.use('/', express.static(path.join(__dirname, '/public')))
app.use(nocache())

let rooms = {  }
const Tone = require('./Tone')
let tone = new Tone()

admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
	databaseURL: 'https://vr-classroom-214b2.firebaseio.com',
	storageBucket: 'gs://vr-classroom-214b2.appspot.com'
})

io.on('connection', function(socket) {
	console.log(socket.id + ' connected')
	io.emit('studentConnected')

	socket.on('joinRoom', function(room, isTeacher, name) {
		if(isTeacher && (rooms[room] && rooms[room].sockets.length > 0)) {
			console.log('room already exists - room already has a teacher')
			io.emit('teacherErr', socket.id)
		}
		else if (!isTeacher && (!rooms[room] || rooms[room].sockets.length == 0)) {
			console.log('room does not exist - students cannot create rooms')
			io.emit('studentJoinErr', socket.id)
		}
		else {
			socket.join(room)
			socket.room = room
			socket.isTeacher = isTeacher
			socket.name = name
			if(!rooms[room]) {
				rooms[room] = { quizzes: {} , feedbacks: {}, students: [], sockets: [], peers: [] }
			}
			if(!isTeacher) {
				rooms[room].students.push(name)
			}
			rooms[room].sockets.push(socket.id)
			console.log(socket.id + ' joined ' + room)
		}
	})

	socket.on('connectPeer', () => {
		let room = socket.room
		if(!rooms[room]) return
		socket.emit('initPeers', rooms[room].peers)
		rooms[room].peers.push(socket.id)
	})

	socket.on('updateMovement', function(name, location, theta, state, photoURL, room){
		io.to(room).emit('movement', name, location, theta, state, photoURL, socket.id)
	})

	socket.on('quiz', function(questions, date) {
		if(socket.isTeacher) { //safety check
			rooms[socket.room].quizzes[date] = []
			socket.broadcast.to(socket.room).emit('quiz', questions, date)
			//console.log('quiz received!', questions)
		}
	})
	socket.on('quizScore', function(score, date) {
		rooms[socket.room].quizzes[date].push({ score, name: socket.name })
	})
	socket.on('requestQuizzes', function() {
		socket.emit('quizzes', rooms[socket.room].quizzes)
	})

	socket.on('smartFeedback', function(q, date) {
		if(socket.isTeacher) { //safety check
			rooms[socket.room].feedbacks[date] = []
			socket.broadcast.to(socket.room).emit('smartFeedback', q, date)
		}
	})
	socket.on('feedback', function(text, date) {
		tone.analyze(text)
			.then(toneAnalysis => {
				let tones = toneAnalysis.result.document_tone.tones
				console.log(tones)
				let tonesById = {}
				tones.forEach(tone => tonesById[tone.tone_id] = tone.score)
				let n = 0
				let positive = tonesById.joy || 0
				let negative = 0
				let net = 0
				if(tonesById.anger) {
					negative += tonesById.anger
					n++
				}
				if(tonesById.sadness) {
					negative += tonesById.sadness
					n++
				}
				if(tonesById.fear) {
					negative += tonesById.fear
					n++
				}
				negative = n == 0 ? 1 : 1 - negative / n
				if(positive == 0) net = negative
				else net = (positive + negative) / 2
				let destructive = tonesById.anger && (!tonesById.analytical || tonesById.anger > tonesById.analytical)
				let analysis = { positive: net, constructive: !destructive }
				rooms[socket.room].feedbacks[date].push({ text, name: socket.name, analysis })
			})
			.catch(err => console.log('error', err))
	})
	socket.on('requestFeedbacks', function() {
		socket.emit('feedbacks', rooms[socket.room].feedbacks)
	})

	socket.on('requestStudents', function() {
		socket.emit('students', rooms[socket.room].students)
	})

	socket.on('openWhiteboard', function() {
		if(socket.isTeacher)
			socket.broadcast.to(socket.room).emit('openWhiteboard')
	})

	socket.on('disconnect', function() {
		io.emit('disconnect', socket.id)
		if(socket.isTeacher) {
			socket.broadcast.to(socket.room).emit('teacherLeft')
		}
		if(rooms[socket.room] != undefined) {
			rooms[socket.room].sockets.pop(socket.id)
		}
		console.log(socket.id + ' disconnected')
	})
})

server.listen(port, function() {
  console.log('listening on:' + port)
})
