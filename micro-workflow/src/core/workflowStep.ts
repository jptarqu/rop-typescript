import {
    BasePrimitiveTypeDefinition,
    BindingPath,
    CustomPrimitiveTypeDefinition,
    getDateValue,
    getNumericValue,
    getObjectValue,
    getStringValue,
    RuntimeBasePrimitiveType,
    TypeDefinition,
    TypeDefinitionHash,
    TypeDefinitionKind,
} from './types';
import { PropertyError, RopResult } from '../../../udf-collector-ui/src/commons/rop/rop'

export interface FunctionInputDefinition {
    readonly name: string
    readonly inputType: TypeDefinition
}
export interface FunctionConstantInputDefinition {
    readonly name: string
    readonly inputType: BasePrimitiveTypeDefinition
}

export interface BindingsHash {
    readonly [inputs: string]:  BindingPath
}
export interface InputConstantsHash {
    readonly [inputs: string]:  string
}

interface InputValuesHash {
    [inputs: string]:  RuntimeBasePrimitiveType | {}
}

export interface WorkflowStepInstanceDefinition {
    readonly functionDefId: string
    readonly inputBindings: BindingsHash
    readonly inputConstants: InputConstantsHash
    readonly outputBinding: BindingPath
    readonly replaceContext: boolean
    readonly doWhenOutputPathExists: 'replace' | 'append'
}
export interface WorkflowStepInstanceDefinitionRendition {
    readonly functionDefId: string
    readonly inputBindings: BindingsHash
    readonly outputBinding: BindingPath
    readonly inputConstants?: InputConstantsHash
    readonly replaceContext?: boolean
    readonly doWhenOutputPathExists?: 'replace' | 'append'
}

export function applyDefinitionDefaults(rend: WorkflowStepInstanceDefinitionRendition) {
    
    const stepInstance: WorkflowStepInstanceDefinition = {
        functionDefId: rend.functionDefId,
        inputConstants: rend.inputConstants ? rend.inputConstants : {},
        inputBindings: rend.inputBindings,
        outputBinding: rend.outputBinding,
        replaceContext: rend.replaceContext ? rend.replaceContext : false,
        doWhenOutputPathExists: rend.doWhenOutputPathExists ? rend.doWhenOutputPathExists : 'replace' 
     }
    return stepInstance
}
type HashResultForWorkflow = RuntimeBasePrimitiveType | Array<RuntimeBasePrimitiveType | {}> | {}
export type ResultForWorkflow = RopResult<HashResultForWorkflow, PropertyError[]>
export type AsyncResultForWorkflow = Promise<RopResult<HashResultForWorkflow, PropertyError[]>>
 
type ApplierFunc = (inputs: InputValuesHash, constInputs: InputConstantsHash, 
                    inputDefinitionsUsed: FunctionInputDefinition[]
                ,   globalTypeDefinitions: TypeDefinitionHash  ) => ResultForWorkflow 
                    // we can trust that the runtime engine has provided all the inputs defined
type ConstInputApplierFunc = (inputs: InputConstantsHash, 
                              defintion: WorkflowFuncDefinition
,                             globalTypeDefinitions: TypeDefinitionHash) => void

const emptyFunc = (_: {}) => { return }
export class WorkflowFuncDefinition {
    private constInputNamesToIdx = {}
    private inputNamesToIdx = {}
    constructor(
              readonly inputConstantsDefinitions: FunctionConstantInputDefinition[]
            , public inputDefinitions: FunctionInputDefinition[]
            , public outputType: TypeDefinition 
                // this is only for design support, at runtime we just return a hash, array or primtive
            , readonly applyFunc: ApplierFunc
            , readonly constantsApplyFunc: ConstInputApplierFunc = emptyFunc
            , readonly applyFuncForTest?: ApplierFunc ) {
        for (let constInputIdx = 0; constInputIdx < inputConstantsDefinitions.length; constInputIdx++) {
            this.constInputNamesToIdx[inputConstantsDefinitions[constInputIdx].name] = constInputIdx
        }
        for (let inputIdx = 0; inputIdx < inputDefinitions.length; inputIdx++) {
            this.inputNamesToIdx[inputDefinitions[inputIdx].name] = inputIdx
        }
    }
    applyConstantBindings(stepInstance: WorkflowStepInstanceDefinition
        ,                 globalTypeDefinitions: TypeDefinitionHash) {
        // allows generating input definitions dynamically
        this.constantsApplyFunc(stepInstance.inputConstants, this, globalTypeDefinitions)
        
    }
    stepInstanceApplyTest(stepInstance: WorkflowStepInstanceDefinition, 
                          contextData: {},
                          globalTypeDefinitions: TypeDefinitionHash): ResultForWorkflow {
        return this.doFuncApply(stepInstance, contextData, 
                                this.applyFuncForTest || this.applyFunc, globalTypeDefinitions)
    }
    stepInstanceApply(stepInstance: WorkflowStepInstanceDefinition, 
                      contextData: {},
                      globalTypeDefinitions: TypeDefinitionHash ): ResultForWorkflow {
        return this.doFuncApply(stepInstance, contextData, this.applyFunc, globalTypeDefinitions)
    }
    private doFuncApply(stepInstance: WorkflowStepInstanceDefinition, 
                        contextData: {},
                        funcToUse: ApplierFunc,
                        globalTypeDefinitions: TypeDefinitionHash): ResultForWorkflow {
        let inputValues: InputValuesHash = {            
        }
        for (let inputKey in stepInstance.inputBindings) {
            if (stepInstance.inputBindings.hasOwnProperty(inputKey)) {
                // console.log('stepInstanceApply ' + inputKey + ' in ' + stepInstance.functionDefId)
                const pathToValue = stepInstance.inputBindings[inputKey]
                const typeExpected = this.inputDefinitions[this.inputNamesToIdx[inputKey]].inputType
                switch (typeExpected.kind) {
                    case  (TypeDefinitionKind.CustomPrimitiveTypeDefinitionName) : 
                        switch (typeExpected.basePrimitiveType) {
                            case 'number':
                                inputValues[inputKey]  = getNumericValue(pathToValue, contextData)
                                break
                            case 'Date':
                                inputValues[inputKey]  = getDateValue(pathToValue, contextData)
                                break
                            default: // treat as string
                                inputValues[inputKey]  = getStringValue(pathToValue, contextData)
                                break
                        }
                        break
                    case  (TypeDefinitionKind.CustomHashTypeDefinition) : 
                        inputValues[inputKey] = getObjectValue(pathToValue, contextData) 
                        break
                    default:
                        break
                }
            }
        }
        const result = funcToUse(inputValues, stepInstance.inputConstants, this.inputDefinitions
        ,                        globalTypeDefinitions)
        return result
    }
    
}

export interface FuncDefinitionHash {
    readonly [inputs: string]:  WorkflowFuncDefinition
}
  