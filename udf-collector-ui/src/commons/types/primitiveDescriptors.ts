import { Validations, startTrack , runValidateIf } from '../rop/rop'

export module Descriptors {

    export interface String {
        required: boolean
        minLen: number
        maxLen: number
    } 
    export interface PatternString {
        required: boolean
        minLen: number
        maxLen: number
        pattern: string
        patternErrMsg: string
    } 
    export interface Numeric {
        required: boolean
        minVal: number
        maxVal: number
    } 
    export interface DateDesc {
        required: boolean
        minVal: Date
        maxVal: Date
    } 
    export interface Choice {
        required: boolean
        options: string[]
    } 

    export function validateString(descriptor: String, subject: string ) {
        const curriedIsWithinRange = 
            (subject2: string) => Validations.isCorrectLen(descriptor.minLen, descriptor.maxLen, subject2)
        const result =
            startTrack(runValidateIf(descriptor.required, Validations.hasValue, subject ))
            .then(curriedIsWithinRange)
            .getResult()
        return result
    }
    export function validateDate(descriptor: DateDesc, subject: string ) {
        const curriedIsWithinRange = 
            (subject2: Date) => Validations.isDateWithinRange(descriptor.minVal, descriptor.maxVal, subject2)
        const result =
            startTrack(runValidateIf(descriptor.required, Validations.hasValue, subject ))
            .then(Validations.tryDate)
            .then(curriedIsWithinRange)
            .getResult()
        return result
    }
    export function validateNumber(descriptor: Numeric, subject: string | number) {
        const curriedIsWithinRange = 
            (subject2: number) => Validations.isWithinRange(descriptor.minVal, descriptor.maxVal, subject2)
        const result =
            startTrack(runValidateIf(descriptor.required, Validations.hasValue, subject ))
            .then(Validations.tryNumber)
            .then(curriedIsWithinRange)
            .getResult()
        return result
    }
    export function validateChoice(descriptor: Choice, subject: string | number) {
        const result =
            startTrack(runValidateIf(descriptor.required, Validations.hasValue, subject ))
            .then((input) => Validations.isOneOf(descriptor.options, input.toString()))
            .getResult()
        return result
    }
}