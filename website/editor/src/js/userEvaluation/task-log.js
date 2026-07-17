export class TaskLog{
    constructor({task = null, startTime = 0}) {
        this.task = task
        this.startTime = startTime

        this.duration = null

        this.runCount = 0

        this.errors = []
        this.templateSelections = []
        this.querySelections = []
        
        this.encodingSnippets = []
        this.configs = []

        this.finalEncoding = null
        this.finalQuery = null

    }

    logError(error) {
        this.errors.push(error)
    }

    logDuration(endTime) {
        this.duration = endTime - this.startTime;
    }

    


}