
const key = "cckDE0isZv64m_tMDfz1G1nkSwY3JogtdcQskG0bHhrr"
const url = "https://api.us-south.tone-analyzer.watson.cloud.ibm.com/instances/8f0036f0-d602-48e4-a49d-95198699e6ec"

const ToneAnalyzerV3 = require('ibm-watson/tone-analyzer/v3')
const { IamAuthenticator } = require('ibm-watson/auth')

class Tone {
    constructor() {
        this.toneAnalyzer = new ToneAnalyzerV3({
            version: '2017-09-21',
            authenticator: new IamAuthenticator({
              apikey: key,
            }),
            url: url,
          });
    }

    analyze(text) {
        const toneParams = {
            toneInput: { 'text': text },
            contentType: 'application/json',
        }
        return this.toneAnalyzer.tone(toneParams)
    }
}

module.exports = Tone