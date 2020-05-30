window.$ = window.jQuery = require('jquery')

import { Vector3, WebGLRenderer, Scene, PerspectiveCamera, GridHelper, TextureLoader, Mesh, MeshBasicMaterial, BoxGeometry, MeshPhysicalMaterial, AmbientLight, DirectionalLight, Box3, FontLoader, TextGeometry, AnimationClip, FileLoader, AnimationMixer, AnimationUtils, Clock, KeyframeTrack, PointLight, Raycaster, Vector2, Frustum, Matrix4, PlaneGeometry, DoubleSide, ImageUtils, MeshLambertMaterial, CanvasTexture, VideoTexture, RGBFormat, LinearFilter } from 'three'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { OBJLoader2 } from 'three/examples/jsm/loaders/OBJLoader2.js'
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MtlObjBridge } from 'three/examples/jsm/loaders/obj2/bridge/MtlObjBridge.js'
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls'
import CapsuleGeometry from '/js/CapsuleGeometry.js'
import '/lib/peerjs.min.js'

import Student from '/js/Student.js'
import StudentUI from './StudentUI'
import { closeApp, switchTo, setOnMenuLoad } from './switch.js'
import selection2 from '/pages/selection2.html'


// import * as firebase from 'firebase/app'
// import 'firebase/storage'

// let firebaseConfig = {
//   apiKey: "AIzaSyByvmyJHzHc472pLWyKhsu1JCaBm2MLf9Y",
//   authDomain: "vr-classroom-214b2.firebaseapp.com",
//   databaseURL: "https://vr-classroom-214b2.firebaseio.com",
//   projectId: "vr-classroom-214b2",
//   storageBucket: "vr-classroom-214b2.appspot.com",
//   messagingSenderId: "659971797979",
//   appId: "1:659971797979:web:76157965ae2a6f224d6dfe",
//   measurementId: "G-E5VEJG1ZHL"
// }

// firebase.initializeApp(firebaseConfig)
// let storageRef = firebase.storage().ref()
// let uploadedPhotoURL = 'https://firebasestorage.googleapis.com/v0/b/vr-classroom-214b2.appspot.com/o/defaultUser.png?alt=media&token=a15c1187-da96-4a93-8963-5ae30be92aa9'
let isTeacher = false

let container

let scene
let mixer

let frustum = new Frustum()

let clock = new Clock()

let mtlLoader = new MTLLoader()
let fbxLoader = new FBXLoader()
let objLoader = new OBJLoader()
let objLoader2 = new OBJLoader2()
let colladaLoader = new ColladaLoader()
let gltfLoader = new GLTFLoader()
let textureLoader = new TextureLoader()
let fontLoader = new FontLoader()

let student
let studentUI
let otherStudents = {}
let seats = {}
let peer
let peerStreams = {}
let planes = {}

$('#landingPage').ready(function() {
  $('#teacherBtn').click(function() {
    isTeacher = true
    console.log('teacher selected')
    // addUploadListener()
    loadVideo()
    addNextButton()
  })

  $('#studentBtn').click(function() {
    isTeacher = false
    console.log('student selected')
    // addUploadListener()
    loadVideo()
    addNextButton()
  })
})

function connectExisting(peers) {
  // console.log('existing', peers)
  peers.forEach(id => {
    let conn = peer.connect(id)
    // console.log("connected to:", id)
    conn.on('open', () => {})//console.log('Connection open'))
    let call = peer.call(id, window.globalStream)
    // console.log('called', call)
    call.on('stream', stream => {
      console.log('onstream', stream)
      peerStreams[id] = stream
      if(planes[id] && !planes[id].material.map) {
        planes[id].material = new MeshBasicMaterial({ map: makeVideoTexture(stream) })
      }
    })
  })
}
function initPeer() {
  window.globalSocket.emit('connectPeer')
  window.globalSocket.once('initPeers', peers => {
    console.log("Create peer:", window.globalSocket.id)
    peer = new Peer(window.globalSocket.id, {
      host: 'localhost',
      port: 80,
      path: '/'
    })
    // peer = new Peer(window.globalSocket.id)
    peer.on('connection', conn => {
      // console.log("another peer connected")
      conn.on('open', () => {})//console.log("peer connection open"))
    })
    peer.on('call', call => {
      // console.log("call received")
      call.on('stream', stream => {
        console.log('onstream', stream)
        peerStreams[call.peer] = stream
        if(planes[call.peer] && !planes[call.peer].material.map) {
          planes[call.peer].material = new MeshBasicMaterial({ map: makeVideoTexture(stream) })
        }
      })
      call.answer(window.globalStream)
    })
    connectExisting(peers)
  })
}
function loadVideo() {
  navigator.mediaDevices.getUserMedia({ audio: true, video: true })
    .then(stream => {
      window.globalStream = stream
      // let video = document.createElement('video')
      // video.id = 'imagePreview'
      // video.autoplay = true
      // video.srcObject = stream
      // document.getElementById('imagePreview-container').appendChild(video)
    })
    .catch(err => {
      console.error("Error initializing video")
      loadVideo()
    })
}

function makeVideoTexture(stream) {
  let video = document.createElement('video')
  video.style.display = 'none'
  video.autoplay = true
  video.srcObject = stream
  document.body.appendChild(video)
  let videoTexture = new VideoTexture(video)
  videoTexture.minFilter = LinearFilter
  videoTexture.magFilter = LinearFilter
  videoTexture.format = RGBFormat
  return videoTexture
}

function addUploadListener() {
  $('#profileImage').on('change', function(){
    $('.loading').show()

    let data = {}
    let file = $('#profileImage')[0].files[0]
    let uploadTask = storageRef.child('images/'+Math.round((new Date()).getTime())+'.jpg').put(file)

    uploadTask.on('state_changed', function(snapshot){
      let progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
      switch (snapshot.state) {
        case firebase.storage.TaskState.PAUSED: // or 'paused'
        console.log('Upload is paused')
        break
        case firebase.storage.TaskState.RUNNING: // or 'running'
        console.log('Upload is running')
        break
      }
    },
    function(error) {
      $('.loading').hide()
      alert('error uploading image: ' + error)
    },
    function() {
      uploadTask.snapshot.ref.getDownloadURL().then(function(downloadURL) {
        $('.loading').hide()
        $('#imagePreview').attr('src', downloadURL)
        uploadedPhotoURL = downloadURL
      })
    })
  })
}

function addNextButton() {
  $('#nextBtn').click(function() {
    let name = $('#nameInput').val().trim()

    if(name.length > 0) {
      switchTo(selection2, false)

      if(isTeacher) {
        $('#createRoom-container').show()
      }
      else {
        $('#joinRoom-container').show()
      }

      $('#createRoomBtn').click(function() {
        let id = genID()
        student = new Student(name, id, isTeacher)
        // student.photoURL = uploadedPhotoURL
        window.globalSocket = student.socket
        initPeer()
        $('#room-id').html('Room Code: ' + id)
        $('#room-id').show()
        $('#dash-button').show()
        startEnvironment()
        closeApp()
      })

      $('#joinRoomForm').on('submit', function(e) {
        e.preventDefault()
        let code = $('#joinRoomInput').val().trim()
        if(code.length == 0) {
          alert('You cannot leave the join code field empty!')
        }
        else {
          student = new Student(name, code, isTeacher)
          // student.photoURL = uploadedPhotoURL
          window.globalSocket = student.socket
          initPeer()
          studentUI = new StudentUI(student.socket)
          $('#dash-button').hide()
          $('#room-id').html('Room Code: ' + code)
          startEnvironment()
          closeApp()
        }
      })
    }
    else {
      alert('You cannot leave the name field empty!')
    }

  })
}

function startEnvironment() {
  createSeats()
  createSocketListeners()
  init()
  animate()
}

function createSeats() {
  // Row 1
  seats['seat 1'] = {x: 24.5, z: -44.5}
  seats['seat 2'] = {x: 24, z: -37.5}
  seats['seat 3'] = {x: 23.5, z: -27}
  seats['seat 4'] = {x: 23.5, z: -20.8}
  seats['seat 5'] = {x: 23.8, z: -15.5}

  // Row 2
  seats['seat 6'] = {x: 16.5, z: -44.5}
  seats['seat 7'] = {x: 17, z: -37.5}
  seats['seat 8'] = {x: 16.5, z: -28}
  seats['seat 9'] = {x: 16, z: -20.8}
  seats['seat 10'] = {x: 16.3, z: -15.5}

  // Row 3
  seats['seat 11'] = {x: 10.5, z: -44.5}
  seats['seat 12'] = {x: 10, z: -37.5}
  seats['seat 13'] = {x: 9.5, z: -28}
  seats['seat 14'] = {x: 9, z: -21.8}
  seats['seat 15'] = {x: 9.3, z: -15.5}

  // Row 4
  seats['seat 16'] = {x: 3.5, z: -45}
  seats['seat 17'] = {x: 3.5, z: -37.5}
  seats['seat 18'] = {x: 3.5, z: -28.4}

  seats['seat 19'] = {x: 3.3, z: -16}
}

function createSocketListeners() {

  student.socket.on('studentJoinErr', function(socketIdIn) {
    console.log('student join error')

    if(student.socketId == socketIdIn) {
      if(confirm('This room does not exist. Please double check the room code entered.')) {
        window.location.reload()
      }
      else {
        window.location.reload()
      }
    }
  })

  student.socket.on('teacherErr', function(socketIdIn) {
    console.log('teacher create room error')

    if(student.socketId == socketIdIn) {
      if(confirm('A classroom with this name already exists.')) {
        window.location.reload()
      }
      else {
        window.location.reload()
      }
    }
  })

  student.socket.on('teacherLeft', function() {
    if(confirm('The teacher has left the room')) {
      window.location.reload()
    }
    else {
      window.location.reload()
    }
  })
  student.socket.on('movement', function(name, location, theta, state, photoURL, socketId) {
    if(student.socketId != socketId) {
      if(otherStudents.hasOwnProperty(socketId)) {
        if(otherStudents[socketId].location != undefined) {
          otherStudents[socketId].location = location

          let maskDistance = 0.8

          if(state == 'Walking') {
            maskDistance = 1
          }

          if(state == 'Sitting') {
            otherStudents[socketId].planeGeometry.position.y = student.height*0.75+0.1
            maskDistance = 1
          }
          else {
            otherStudents[socketId].planeGeometry.position.y = student.height+0.1
          }

          otherStudents[socketId].geometry.position.x = location.x - Math.sin(theta)*maskDistance
          otherStudents[socketId].geometry.position.z = location.z - Math.cos(theta)*maskDistance
          otherStudents[socketId].geometry.rotation.y = theta

          otherStudents[socketId].planeGeometry.position.x = location.x
          otherStudents[socketId].planeGeometry.position.z = location.z
          otherStudents[socketId].planeGeometry.rotation.y = theta

          if(state == 'Sitting' && otherStudents[socketId].state != 'Sitting') {
            otherStudents[socketId].sittingAnimation.play()
            otherStudents[socketId].walkingAnimation.stop()
            otherStudents[socketId].idleAnimation.stop()
            otherStudents[socketId].state = 'Sitting'
          }
          else if(state == 'Walking' && otherStudents[socketId].state != 'Walking') {
            otherStudents[socketId].walkingAnimation.play()
            otherStudents[socketId].sittingAnimation.stop()
            otherStudents[socketId].idleAnimation.stop()
            otherStudents[socketId].state = 'Walking'
          }
          else if(state=='Idle' && otherStudents[socketId].state != 'Idle'){
            otherStudents[socketId].idleAnimation.play()
            otherStudents[socketId].sittingAnimation.stop()
            otherStudents[socketId].walkingAnimation.stop()
            otherStudents[socketId].state = 'Idle'
          }
        }
      }
      else {
        otherStudents[socketId] = {}

        gltfLoader.load(
          'models/Character.glb',
          function(gltf) {
            let model = gltf.scene
            model.scale.set(3.45, 3.45, 3.45)
            mixer = new AnimationMixer(model)
            let fileAnimations = gltf.animations
            let idleAnim = AnimationClip.findByName(fileAnimations, 'Idle')
            let walkingAnim = AnimationClip.findByName(fileAnimations, 'Walking')
            let sittingAnim = AnimationClip.findByName(fileAnimations, 'Sitting')
            let idle = mixer.clipAction(idleAnim)
            let walking = mixer.clipAction(walkingAnim)
            let sitting = mixer.clipAction(sittingAnim)

            let maskDistance = 0.8

            if(state == 'Sitting') {
              sitting.play()
            }
            else if(state == 'Walking') {
              walking.play()
              maskDistance = 1
            }
            else if(state == 'Idle') {
              idle.play()
            }

            let nameTag = document.createElement('div')
            nameTag.innerHTML = name.toString()
            nameTag.id = socketId
            nameTag.className = 'nameTag'

            let videoTexture = undefined
            console.log(peerStreams)
            if(peerStreams[socketId]) {
              videoTexture = makeVideoTexture(peerStreams[socketId])
            }
            let planeMaterial = videoTexture ? new MeshBasicMaterial({ map: videoTexture }) : new MeshBasicMaterial({ color: 0xff0000 })
            //let planeMaterial = new MeshLambertMaterial({ map: textureLoader.load(photoURL), color : 0xffffff, side: DoubleSide })
            let planeGeometry = new PlaneGeometry( 1, 1, 32 )
            let plane = new Mesh(planeGeometry, planeMaterial)
            planes[socketId] = plane
            scene.add(plane)

            otherStudents[socketId] = {name: name, geometry: model, planeGeometry: plane, nameTag: nameTag, location: location, walkingAnimation: walking, idleAnimation: idle, sittingAnimation: sitting, state: state}

            otherStudents[socketId].geometry.position.x = location.x
            otherStudents[socketId].geometry.position.z = location.z
            otherStudents[socketId].geometry.rotation.y = theta

            if(state == 'Sitting') {
              otherStudents[socketId].planeGeometry.position.y = student.height*0.75+0.1
              maskDistance = 1
            }

            otherStudents[socketId].planeGeometry.position.x = location.x - Math.sin(theta)*maskDistance
            otherStudents[socketId].planeGeometry.position.z = location.z - Math.cos(theta)*maskDistance
            otherStudents[socketId].planeGeometry.position.y = student.height+0.1
            otherStudents[socketId].planeGeometry.rotation.y = theta

            scene.add(otherStudents[socketId].geometry)
            scene.add(otherStudents[socketId].planeGeometry)
            document.body.appendChild(otherStudents[socketId].nameTag)
          },
          undefined,
          function(error) {
            console.error(error)
          }
        )
      }
    }
  })

  student.socket.on('disconnect', function(socketId) {
    if(otherStudents.hasOwnProperty(socketId)) {
      scene.remove(otherStudents[socketId].geometry)
      scene.remove(otherStudents[socketId].walkingGeometry)
      scene.remove(otherStudents[socketId].planeGeometry)
      scene.remove(otherStudents[socketId].textGeometry)
      $('#'+socketId).remove()
      delete otherStudents[socketId]
    }
  })

}

function init() {
  container = document.getElementById('canvas-parent')

  container.appendChild(student.renderer.domElement)

  scene = new Scene()

  // User interaction needed for initial pointer lock control sequence
  container.addEventListener('click', function () {
    student.controls.lock()
  }, false)

  let lights = [
    new AmbientLight(0x7f7f7f, 0.5),
    new PointLight(0x7f7f7f, 1, 0),
    new PointLight(0x7f7f7f, 1, 0),
    new DirectionalLight(0xfffdb5, .5),
  ]
  lights[1].position.set(16, 5, -20)
  lights[2].position.set(16, 5, -40)
  lights[3].position.set(1, 0.6, 0).normalize()
  lights.forEach(l => scene.add(l))

  scene.add(student.controls.getObject())

  drawMap()
}

function animate() {
  requestAnimationFrame(animate)
  student.renderer.render(scene, student.camera)
  student.updateMovement()

  //console.log(planes)
  for(let plane of Object.values(planes)) {
    if(plane && plane.material && plane.material.map) {
      plane.material.map.update()
    }
  }

  scene.traverse((node) => {
    if (node.isMesh) node.material.transparent = false
  })

  scene.traverse( function( object ) {
    object.frustumCulled = false
  } )

  let delta = clock.getDelta()

  if (mixer) { mixer.update( delta ) }

  for (var socketId in otherStudents) {
    if (otherStudents.hasOwnProperty(socketId)) {
      if(otherStudents[socketId].location != undefined) {
        student.camera.updateMatrix()
        student.camera.updateMatrixWorld()

        frustum.setFromProjectionMatrix(new Matrix4().multiplyMatrices(student.camera.projectionMatrix, student.camera.matrixWorldInverse))

        let pos = new Vector3(otherStudents[socketId].location.x, student.height, otherStudents[socketId].location.z)

        if (frustum.containsPoint(pos)) {
          otherStudents[socketId].nameTag.innerHTML = otherStudents[socketId].name
        }
        else {
          otherStudents[socketId].nameTag.innerHTML = ''
        }

        const tempV = new Vector3()
        const canvas = student.renderer.domElement

        // otherStudents[socketId].geometry.updateWorldMatrix(true, false)
        otherStudents[socketId].geometry.getWorldPosition(tempV)
        tempV.y = student.height+1
        tempV.project(student.camera)

        const x = (tempV.x *  .5 + .5) * canvas.clientWidth
        const y = (tempV.y * -.5 + .5) * canvas.clientHeight

        otherStudents[socketId].nameTag.style.transform = `translate(-50%, -50%) translate(${x}px,${y}px)`
      }
    }
  }

  student.availableSeat = 'none'
  let showPrompt = false

  for (var seatName in seats) {
    if(student.seat == seatName) {
      student.controls.getObject().position.x=seats[seatName].x
      student.controls.getObject().position.z=seats[seatName].z
    }
    else if (seats.hasOwnProperty(seatName)) {
      if(Math.abs(student.controls.getObject().position.x-seats[seatName].x)<2 && Math.abs(student.controls.getObject().position.z-seats[seatName].z)<2) {
        student.availableSeat = seatName
        showPrompt = true
      }
    }
  }

  if(showPrompt) {
    $('#interaction-prompt').show()
    $('#interaction-prompt').html('Click to Sit')
  }
  else {
    $('#interaction-prompt').hide()
  }

}

function drawMap() {
  let gridXZ = new GridHelper(50, 50)
  scene.add(gridXZ)

  colladaLoader.load( '/models/s.dae', function ( object ) {
    let classroom = object.scene
    classroom.traverse(child => {
      if(child.material) {
        if(child.material instanceof Array) {
          child.material = child.material.map(m =>
            new MeshPhysicalMaterial( { map:  m.map, clearcoat: 0.2, color: m.color || 0xffffff } )
          )
        }
        else child.material = new MeshPhysicalMaterial( { map: child.material.map, clearcoat: 0.2, color: child.material.color || 0xffffff } )
      }

    })
    classroom.scale.multiplyScalar(4)
    scene.add(classroom)
  })
}

function genID () {
  return '' + Math.random().toString(36).substr(2, 9)
}


function onWindowResize(){
  if(student != undefined && student.camera != undefined) {
    student.camera.aspect = window.innerWidth / window.innerHeight
    student.camera.updateProjectionMatrix()
    student.renderer.setSize(window.innerWidth, window.innerHeight)
  }
}

window.addEventListener('resize', onWindowResize, false)
