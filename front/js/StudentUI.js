import { switchTo, closeApp } from './switch.js'

import liveQuizClient from '/pages/live-quiz-client.html'
import feedbackForm from '/pages/feedback-form.html'
import whiteboard from '/pages/whiteboard.html'

export default class StudentUI {

    constructor(socket) {
        this.socket = socket
        this.questionIndex = 0
        this.numCorrect = 0

        let self = this
        socket.on('quiz', (questions, date) => { 
            switchTo('<div id="quiz-client" class="dashboard">' + liveQuizClient + '</div>', 'up')
            $('.menu-content').hide()
            self.questionIndex = 0
            self.numCorrect = 0
            self.questions = questions
            self.date = date
            self.nextQuestion()
        })
        socket.on('smartFeedback', (q, date) => {
            switchTo(feedbackForm, 'up')
            $('.menu-content').hide()
            $('#feedback-question').text(q)
            $('#send-feedback').click(function() {
                $('#send-feedback').hide()
                socket.emit('feedback', $('#feedback-input').val(), date)
                $('#feedback-form').html('<div class="correct" style="font-size: 2rem;">Feedback submitted!</div>')
                setTimeout(closeApp, 3000)
            })
        })
        socket.on('openWhiteboard', () => {
            switchTo(whiteboard, 'up')
            $('iframe.whiteboard').attr('src', "https://socketiowhiteboard.herokuapp.com/readonly.html")
            $('.menu-content').hide()
            //openWhiteboard()
        })
    }

    compare(a, b) {
        return a && b && a.toLowerCase().trim().replace(/ /g,'') == b.toLowerCase().trim().replace(/ /g,'')
    }

    nextQuestion() {
        if(this.questionIndex > 0) {
            if(this.pq.type == 'mc' && this.compare($('input[name="quiz-mc-radios"]:checked').val(), this.pq.answer))
                this.numCorrect++
            if(this.pq.type == 'frq' && this.compare($('#quiz-answer-input').val(), this.pq.answer))
                this.numCorrect++
        }
        if(this.questionIndex >= this.questions.length) {
            this.finishQuiz()
            return
        }
        let q = this.questions[this.questionIndex]
        this.renderQuiz(q, this.questionIndex == this.questions.length - 1)
        this.questionIndex++
        this.pq = q
    }

    finishQuiz() {
        $('#quiz-mc').hide()
        $('#quiz-frq').hide()
        $('#quiz-client label').hide()
        $('#next-question-button').hide()
        $('#quiz-client .content').append(`<div class="you-score">You scored <span class="correct">${this.numCorrect}</span> out of <span class="correct">${this.questions.length}</span>.</div>`)
        this.socket.emit('quizScore', this.numCorrect / this.questions.length, this.date)
        setTimeout(closeApp, 3000)
    }

    renderQuiz(question, last) {
        let self = this
        let str = liveQuizClient.replace('\${question}', question.question)
        if(question.type == 'mc') {
            let correctIndex = Math.floor(Math.random() * 3) + 1
            let wrongIndex0 = correctIndex % 3 + 1
            let wrongIndex1 = (correctIndex + 1) % 3 + 1
            if(Math.random() < .5) {
                let tmp = wrongIndex0
                wrongIndex0 = wrongIndex1
                wrongIndex1 = tmp
            }
            str = str
                .replace('\${isCorrect' + correctIndex + '}', question.answer)
                .replace('\${isCorrect' + wrongIndex0 + '}', question.wrong[0])
                .replace('\${isCorrect' + wrongIndex1 + '}', question.wrong[1])
                .replace('\${answer' + correctIndex + '}', question.answer)
                .replace('\${answer' + wrongIndex0 + '}', question.wrong[0])
                .replace('\${answer' + wrongIndex1 + '}', question.wrong[1])
        }
        $('#quiz-client').html(str).ready(function() {
            $('#quiz-' + question.type).show()
            $('#quiz-' + ((question.type == 'frq') ? 'mc' : 'frq')).hide()
            $('#next-question-button').html(last ? 'Finish' : 'Next').click(() => self.nextQuestion())
        })
    }
}