
export default class Quiz {

    constructor(socket) {
        this.socket = socket
        this.questions = []
        this.editing = -1
    }

    initEvents() {
        $('#add-question').click(this.addQuestion.bind(this))
        $('#answer-input').on('keydown', ({ keyCode }) => {
            if(keyCode === 13)
                $('#add-question').click()
        })
        $('#question-type').on('change', function() {
            if(this.value == 'frq') {
                $('.frq').show()
                $('.mc').hide()
            }
            else {
                $('.frq').hide()
                $('.mc').show()
            }
        })
        $('.frq').hide()
    }

    clearForm() {
        $('#question-input').val('')
        $('#answer-input').val('')
        $('#correct-answer').val('')
        $('#wrong-answer-1').val('')
        $('#wrong-answer-2').val('')
        $('#question-input').focus()
    }

    listenPreview() {
        let self = this
        $('.preview-group').click(function() {
            self.editing = parseInt($(this).attr('index'))
            let { question, answer, wrong, type } = self.questions[self.editing]
            $('#question-input').val(question)
            if(type == 'frq') $('#answer-input').val(answer)
            else {
                $('#correct-answer').val(answer)
                $('#wrong-answer-1').val(wrong[0])
                $('#wrong-answer-2').val(wrong[1])
            }
            $('#add-question').text('Confirm Edit')
        })
        $('#send-quiz').click(function() {
            self.socket.emit('quiz', self.questions, new Date())
        })
    }

    makeQuestion() {
        let question = $('#question-input').val()
        let type = $('#question-type').val()
        let answer = type == 'frq' ? $('#answer-input').val() : $('#correct-answer').val()
        let wrong = type == 'mc' ? [ $('#wrong-answer-1').val(), $('#wrong-answer-2').val() ] : undefined
        return { question, answer, wrong, type }
    }

    addQuestion() {
        if(this.editing != -1) {
            this.questions[this.editing] = this.makeQuestion()
            this.editing = -1
            $('#add-question').text('Add Question')
        }
        else 
            this.questions.push(this.makeQuestion())
        $('#display-questions').html(this.renderHTML())
        this.listenPreview()
        this.clearForm()
    }

    renderHTML() {
        let str = '<h1>Preview</h1><br>'
        str += '<div id="preview-container">'
        this.questions.forEach(({ question, answer, wrong, type }, i) => {
            let content = `<div class="preview-question"><b>Question: </b>${question}</div>`
            if(type == 'frq') content += `<div class="preview-answer"><b>Answer: </b>${answer}</div>`
            else content += `
                <div class="preview-answer correct"><b>${answer}</b></div>
                <div class="preview-answer wrong">${wrong[0]}</div>
                <div class="preview-answer wrong">${wrong[1]}</div>
            `
            str += `
                <div class="preview-group" index=${i}>
                    <div class="edit-icon"></div>
                    ${content}
                </div>
            `
        })
        str += `</div>
            <button id='send-quiz'>Send Quiz to Students</button>
        `
        return str
    }
}