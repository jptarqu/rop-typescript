import { CustomHashTypeDefinition } from './types'
import { FuncDefinitionHash, ResultForWorkflow, WorkflowStepInstanceDefinition } from './workflowStep'
import { setValueInBindingPath } from './bindingPathHelpers'
import { PropertyError, GOOD, pass } from '../../../udf-collector-ui/src/commons/rop/rop'

export function RunWorkflow(globalFuncDefs: FuncDefinitionHash, instances: WorkflowStepInstanceDefinition[], 
                            contextType: CustomHashTypeDefinition, contextData: {}) { 
    let lastResult: ResultForWorkflow = pass(contextData)
    let currErrors: PropertyError[] = []
    for (var stepIdx = 0; stepIdx < instances.length && currErrors.length === 0; stepIdx++ ) {
        const currStepInstance = instances[stepIdx]
        lastResult = globalFuncDefs[currStepInstance.functionDefId].stepInstanceApply(currStepInstance, contextData)
        
        switch (lastResult.kind) {
            case GOOD:
                setValueInBindingPath(contextType, currStepInstance.outputBinding, contextData, 
                                    lastResult.payload, currStepInstance.doWhenOutputPathExists === 'append')
                console.log('Step done: ' + JSON.stringify(contextData))
                break
            default:
                console.log('Step error: ' + JSON.stringify(lastResult.error))
                currErrors = lastResult.error
                break
        }
    }
    return lastResult
}