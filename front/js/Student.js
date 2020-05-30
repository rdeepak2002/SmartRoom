import { Vector3, PerspectiveCamera, WebGLRenderer } from 'three'
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls'
import IO from 'socket.io-client'

export default class Student {

  constructor(name, socketRoom, isTeacher) {
    this.name = name
    this.photoURL = 'https://firebasestorage.googleapis.com/v0/b/vr-classroom-214b2.appspot.com/o/defaultUser.png?alt=media&token=a15c1187-da96-4a93-8963-5ae30be92aa9'

    this.isTeacher = isTeacher

    this.movementSpeed = 0.15
    this.height = 5.5
    this.startX = 33.87
    this.startZ = -50.10
    this.lookAtInitial = new Vector3(15.45, this.height, -25.27)

    this.moveForward = false
    this.moveBackward = false
    this.moveLeft = false
    this.moveRight = false

    this.velocity = new Vector3()
    this.direction = new Vector3()

    this.camera = new PerspectiveCamera (75, window.innerWidth/window.innerHeight, 0.1, 10000)
    this.camera.position.y = this.height
    this.camera.position.x = this.startX
    this.camera.position.z = this.startZ
    this.camera.lookAt(this.lookAtInitial)

    this.renderer = new WebGLRenderer({antialias:true})
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setClearColor(0xEAEEF1, 1)

    this.controls = new PointerLockControls(this.camera, this.renderer.domElement)

    this.state = 'Idle'
    this.seat = 'none'
    this.availableSeat = 'none'
    this.theta = 0

    this.socket = IO()
    this.socketRoom = socketRoom

    this.socket.on('connect', () => {
      this.socketId = this.socket.id
      this.socket.emit('joinRoom', this.socketRoom, isTeacher, name)
    })

    this.socket.on('studentConnected', () => {
      //console.log('student connected!')
    })

    this.initMouseClick(this)
    this.initKeyDown(this)
    this.initKeyUp(this)
  }

  initMouseClick(student) {
    let onMousePress = function() {
      if(student.seat== 'none') {
        student.seat = student.availableSeat
      }
      else {
        student.controls.getObject().position.z -= 2
        student.seat = 'none'
      }
    }
    document.addEventListener("click", onMousePress)
  }

  initKeyDown(student) {
    let onKeyDown = function (event) {
      switch (event.keyCode) {
        case 38: // up
        case 87: // w
          student.moveForward = true
          break

        case 37: // left
        case 65: // a
          student.moveLeft = true
          break

        case 40: // down
        case 83: // s
          student.moveBackward = true
          break

        case 39: // right
        case 68: // d
          student.moveRight = true
          break
      }
    }

    document.addEventListener('keydown', onKeyDown, false)
  }

  initKeyUp(student) {
    let onKeyUp = function (event) {
      switch (event.keyCode) {
        case 38: // up
        case 87: // w
          student.moveForward = false
          break

        case 37: // left
        case 65: // a
          student.moveLeft = false
          break

        case 40: // down
        case 83: // s
          student.moveBackward = false
          break

        case 39: // right
        case 68: // d
          student.moveRight = false
          break
      }
    }

    document.addEventListener('keyup', onKeyUp, false)
  }

  updateMovement() {
    if (this.controls.isLocked === true) {
      if(this.moveForward == true)
        this.direction.z = -1.0
      else if(this.moveBackward == true){
        this.direction.z = 1.0
      }
      else if(this.moveForward == false && this.moveBackward == false){
        this.direction.z = 0
      }

      if(this.moveRight == true)
        this.direction.x = -1.0
      else if(this.moveLeft == true){
        this.direction.x = 1.0
      }
      else if(this.moveRight == false && this.moveLeft == false){
        this.direction.x = 0
      }

      if(this.seat == 'none') {
        this.direction.normalize() // this ensures consistent movements in all directions

        this.velocity.z = this.direction.z * this.movementSpeed
        this.velocity.x = this.direction.x * this.movementSpeed
        this.velocity.y = this.direction.y * this.movementSpeed

        this.controls.moveRight(- this.velocity.x)
        this.controls.moveForward(- this.velocity.z)
        this.controls.getObject().position.y += (this.velocity.y)

        let pos = this.controls.getObject().position
        let minX = 2
        let maxX = 35
        let minZ = -53
        let maxZ = -2

        // console.log(pos)

        if(pos.x > maxX) {
          this.controls.getObject().position.x = maxX
        }
        if(pos.x < minX) {
          this.controls.getObject().position.x = minX
        }
        if(pos.z > maxZ) {
          this.controls.getObject().position.z = maxZ
        }
        if(pos.z < minZ) {
          this.controls.getObject().position.z = minZ
        }
      }
    }

    let wpVector = new Vector3();
    this.camera.getWorldDirection(wpVector)
    let camVector = wpVector
    this.theta = Math.atan2(camVector.x, camVector.z)

    if(this.seat != 'none') {
      this.camera.position.y = this.height*0.75

      this.state = 'Sitting'
      this.theta = Math.PI*1/2
    }
    else {
      this.camera.position.y = this.height

      if(this.direction.length() > 0) {
        this.state = 'Walking'
      }
      else {
        this.state = 'Idle'
      }
    }

    this.socket.emit('updateMovement', this.name, this.controls.getObject().position, this.theta, this.state, this.photoURL, this.socketRoom)
  }

}
