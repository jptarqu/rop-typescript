
export const GOOD = 'Good'
export type GOOD = typeof GOOD
export const BAD = 'Bad'
export type BAD = typeof BAD

export interface Good<T> {
    kind: GOOD
    payload: T
} 

export interface Bad<ErrType> {
    kind: BAD
    error: ErrType
} 
export interface PropertyError {
    errorDescription: string
    propName?: string
} 
export function getErrorsAsString(errs: PropertyError[]) {
    return errs.map((currVal) => currVal.errorDescription)
}
export type RopResult<T, ErrType>  =  Good<T> | Bad<ErrType>

export function pass<T>(payload: T): Good<T> {
    return { kind: GOOD,  payload }
}

export function fail<T>(error: T): Bad<T> {
    return { kind: BAD, error }
}
// function failWithDesc(error: string): Bad<PropertyError> {
//     return { kind: BAD, error: { errorDescription: error } }
// }

export type RopBindMiddleware<ErrType> = (result: RopResult<any, ErrType>, stepName: string) => void
export class RopBind<A, ErrType> {
    static startRop<A, ErrType>(input: A, middleware: RopBindMiddleware<ErrType>[] = []) {
        return new RopBind(pass(input), middleware)
    }
    static async startAsyncRop<A, ErrType>(input: A, middleware: RopBindMiddleware<ErrType>[] = []) {
        return new RopBind(pass(input), middleware)
    }
    constructor(private firstResult: RopResult<A, ErrType>, middleware: RopBindMiddleware<ErrType>[] = []) {

    }
    then<T>(nextFunc: (input: A) => RopResult<T, ErrType>) {
        const nextResult = this.thenResult(nextFunc)
        return new RopBind(nextResult)
    }
    async thenAsync<T>(nextFunc: (input: A) => Promise<RopResult<T, ErrType>>) {
        const nextResult = await this.thenAsyncResult(nextFunc)
        return new RopBind(nextResult)
    }
    map<T>(nextFunc: (input: A) => T) {
        const nextResult = this.thenMap(nextFunc)
        return new RopBind(nextResult)
    }
    getResult() {
        return this.firstResult
    }
    
    private thenMap<T>(nextFunc: (input: A) => T) {
        const firstResult = this.firstResult
        switch (firstResult.kind) {
            case GOOD :
                const secondRes = pass(nextFunc(firstResult.payload))
                return secondRes
            case BAD :
                return (firstResult)
            default:
                return (firstResult)

        }
    }
    private thenResult<T>(nextFunc: (input: A) => RopResult<T, ErrType>) {
        const firstResult = this.firstResult
        switch (firstResult.kind) {
            case GOOD :
                const secondRes = nextFunc(firstResult.payload)
                return secondRes
            case BAD :
                return (firstResult)
            default:
                return (firstResult)

        }
    }
    private thenAsyncResult<T>(nextFunc: (input: A) => Promise<RopResult<T, ErrType>>): Promise<RopResult<T, ErrType>> {
        return new Promise((resolve, reject) => {
            const firstResult = this.firstResult
            switch (firstResult.kind) {
                case GOOD :
                    const secondRes = nextFunc(firstResult.payload)
                    resolve(secondRes)
                    break
                case BAD :
                    resolve(firstResult)
                    break
                default:
                    resolve(firstResult)
                    break

            }
        })
    }
}


export function startTrack<A, ErrType>(firstResult: RopResult<A, ErrType>) {
    return new RopBind(firstResult)
    // return {
    //     then: function (nextFunc: (rendition: A) => RopResult<T, ErrType>) {
    //         switch (firstResult.kind) {
    //             case GOOD :
    //                 const secondRes = nextFunc(firstResult.payload);
    //                 return secondRes;
    //             case BAD :
    //                 return (firstResult);
    //             default:
    //                 return failWithDesc('system error, default case');

    //         }
            
    //     }
    // };
}
export function runValidateIf<A, ErrType>(evaluate: boolean, evalFunc: (input: A) => RopResult<A, ErrType>, input: A) {
    if (evaluate) {
        return evalFunc(input)
    } else {
        return pass(input)
    }
}

export module Validations {

    export function passIfTrue< A>(nextFunc: (input: A) => boolean, errMsg: string, subject: A) {
        const evalRes = nextFunc(subject)
        const secondRes = evalRes ? pass(subject) : fail({ errorDescription: errMsg})
        return secondRes
    }
    export function isWithinRange(min: number, max: number, subject: number): 
        RopResult<number, PropertyError> {
        if (subject >= min && subject <= max) {
            return pass(subject )
        } else {
            return fail( { errorDescription: `Must be between ${min} and ${max}` }  )
        }
    }
    export function tryDate(subject: string): 
        RopResult<Date, PropertyError> {
        if (isNullOrEmpty(subject)) {
            return pass( new Date() )
        }
        const parsedSubject = new Date(subject)
        if (parsedSubject.toString() === 'Invalid Date') {
            return fail( { errorDescription: 'Must be a valid date' }  )
        } else {
            return pass( parsedSubject )
        }
    }
    export function isDateWithinRange(min: Date, max: Date, subject: Date): 
        RopResult<Date, PropertyError> {
        if (subject >= min && subject <= max) {
            return pass(subject )
        } else {
            return fail( { errorDescription: `Must be between ${min.toDateString()} and ${max.toDateString()}` }  )
        }
    }

    // export curriedIsWithinRange

    export function isNumberKeepStr(subject: string): 
        RopResult<string, PropertyError> {
        if (isNullOrEmpty(subject)) {
            return pass( '' )
        }
        const parsedNum = Number(subject)
        if (isNullOrEmpty(subject) || isNaN(parsedNum)) {
            return fail( { errorDescription: 'Must be a valid number' }  )
        } else {
            return pass(subject )
        }
    }
    export function tryNumber(subject: string): 
        RopResult<number, PropertyError> {
        if (isNullOrEmpty(subject)) {
            return pass( 0 )
        }
        const parsedNum = Number(subject)
        if (isNaN(parsedNum)) {
            return fail( { errorDescription: 'Must be a valid number' }  )
        } else {
            return pass( parsedNum )
        }
    }
    export function isNullOrEmpty(subject: string | number) {
        return (subject == null || subject.toString().trim() === '')
    }
    export function hasValue(subject: string | number): 
        RopResult<string, PropertyError> {
        if (isNullOrEmpty(subject)) {
            return fail( { errorDescription: 'Must not be empty' }  )
        } else {
            return pass(subject.toString() )
        }
    }
    export function isInteger(subject: number): 
        RopResult<number, PropertyError> {
        if (subject % 1 !== 0) {
            return fail( { errorDescription: 'Must be integer' }  )
        } else {
            return pass(subject)
        }
    }
    export function isCorrectLen(min: number, max: number, subject: string): 
        RopResult<string, PropertyError> {
        const len = subject.length
        if (isNullOrEmpty(subject) || (len >= min && len <= max)) {
            return pass(subject )
        } else {
            return fail( { errorDescription: `Length must be between ${min} and ${max}` }  )
        }
    }
    export function isOneOf(choices: string[], subject: string): 
        RopResult<string, PropertyError> {
        if (choices.findIndex((currval) => currval === subject) >= 0) {
            return pass(subject )
        } else {
            const choicesStr = choices.join(', ')
            return fail( { errorDescription: `Must be one of the following: ${choicesStr}` }  )
        }
    }
    export function isNumberAndWithinRange(min: number, max: number, subject: string) {
        const curriedIsWithinRange = (subject2: number) => isWithinRange(min, max, subject2)
        // const workflow =
        //     start(tryNumber(subject))
        //     .then(curriedIsWithinRange);
        const result =
            startTrack(tryNumber(subject))
            .then(curriedIsWithinRange)
            .then(curriedIsWithinRange)
            .getResult()
        return result
    }

}