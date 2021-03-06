import { InputMsg, NoEventMsg, ResultForWorkflow } from '../../../../shared/src/commons/editTypes'
import { BAD, GOOD, PropertyError } from '../../../../shared/src/commons/rop/rop'
import {
    PropInfoTxtDisplay, PropInfoTxtInput,
    PropOptsDisplay, SimpleActionInfo
} from '../../../../shared/src/commons/presentation/viewTypes'
import { AsyncMiddleWareFunc, SyncWorkflowStep, WorkflowStep } from '../../../../shared/src/commons/workflowStep'
import { buildRenderWorkflowSteps } from '../workflows/renderWorkflow'
import { buildWireViewElementsWorkflow } from '../workflows/wireViewElementsWorkflow'
import { runAsyncWorkflow2, runWorkflow2 } from '../../../../shared/src/commons/workflowRuntime'

export interface ErrorReporterView {
    readonly currErrors: HTMLUListElement
}
export interface ViewDescription<C> {
    readonly fieldsWithOpts: PropOptsDisplay<C>[],
    readonly readonlyFields: PropInfoTxtDisplay[],
    readonly editTxtFields: PropInfoTxtInput[],
    readonly actionStarters: SimpleActionInfo[]
    readonly viewScopeName: string
}
export interface BasicComponentInitialization<DomainType,
    InputType, ViewType, SupportingDataType> {
    readonly input?: InputType,
    readonly supportData?: SupportingDataType,
    readonly domain?: DomainType,
    readonly view: ViewType,
    readonly msgSender?: (msg: InputMsg) => void,
    readonly currErrors: PropertyError[],
    readonly viewDescriptions: ViewDescription<BasicComponentInitialization<DomainType,
        InputType, ViewType, SupportingDataType>>,
    readonly setupWorkflow: WorkflowStep<BasicComponentInitialization<DomainType,
        InputType, ViewType, SupportingDataType>>[],
    readonly extraInitializationMap?: (initData: BasicComponentInitialization<DomainType,
        InputType, ViewType, SupportingDataType>,
                                       currContext: BasicComponent<DomainType,
           InputType, ViewType, SupportingDataType>) => BasicComponent<DomainType,
        InputType, ViewType, SupportingDataType>

}
export interface BasicComponent<DomainType,
    InputType, ViewType, SupportingDataType> {
    readonly input: InputType,
    readonly supportData: SupportingDataType,
    readonly domain?: DomainType,
    readonly view: ViewType,
    readonly msgSender: (msg: InputMsg) => void,
    readonly currErrors: PropertyError[],
    readonly viewDescriptions: ViewDescription<BasicComponent<DomainType,
        InputType, ViewType, SupportingDataType>>,
    readonly currMsg: InputMsg,
}

export class BasicScreen<DomainType,
    InputType, ViewType, SupportingDataType> {

    protected currentContext: BasicComponent<DomainType,
        InputType, ViewType, SupportingDataType>
    private renderSteps: SyncWorkflowStep<BasicComponent<DomainType,
        InputType, ViewType, SupportingDataType>>[]

    protected preMiddleware:AsyncMiddleWareFunc<BasicComponent<DomainType,
        InputType, ViewType, SupportingDataType>>[] = []
    constructor() {
        this.startViewWireWorkflow = this.startViewWireWorkflow.bind(this)
        this.startComponentSetupWorkflow = this.startComponentSetupWorkflow.bind(this)
        this.afterSetupWorkflowCompletes = this.afterSetupWorkflowCompletes.bind(this)

        this.startScreenWorkflow = this.startScreenWorkflow.bind(this)
        this.startServerWorkflow = this.startServerWorkflow.bind(this)
        this.afterWorkflowCompleted = this.afterWorkflowCompleted.bind(this)
        this.updateCurrMsg = this.updateCurrMsg.bind(this)
        this.doRender = this.doRender.bind(this)


    }


    protected updateCurrMsg(msg: InputMsg) {
        this.currentContext = {... this.currentContext, currMsg: msg}
    }
    protected startScreenWorkflow(steps: SyncWorkflowStep<BasicComponent<DomainType,
        InputType, ViewType, SupportingDataType>>[]) {
        const result = runWorkflow2(steps, this.currentContext, this.preMiddleware)
        this.afterWorkflowCompleted(result)
    }
    protected startServerWorkflow(steps: WorkflowStep<BasicComponent<DomainType,
        InputType, ViewType, SupportingDataType>>[]) {
        let finalResultPromise = runAsyncWorkflow2(steps, this.currentContext)
        finalResultPromise.then(this.afterWorkflowCompleted)
    }
    protected startViewWireWorkflow(intializationData: BasicComponentInitialization<DomainType,
        InputType, ViewType, SupportingDataType>) {
        const wiringViewSteps = buildWireViewElementsWorkflow(intializationData.viewDescriptions)
        const result = runWorkflow2(wiringViewSteps, intializationData)
        switch (result.kind) {
            case GOOD:
                const newIntializationData = result.payload
                this.startComponentSetupWorkflow(newIntializationData)
                break
            case BAD:
                console.error(result.error)
                break
            default:
                console.error(result)
                break
        }
    }
    protected startViewWireWorkflowWithVdom(intializationData: BasicComponentInitialization<DomainType,
        InputType, ViewType, SupportingDataType>,
                                            renderFunc: () => void ) {
        renderFunc()
        requestAnimationFrame((_) => this.startViewWireWorkflow(intializationData))
    }
    private startComponentSetupWorkflow(intializationData: BasicComponentInitialization<DomainType,
        InputType, ViewType, SupportingDataType>) {
        const resultPromise = runAsyncWorkflow2(intializationData.setupWorkflow, intializationData)
        resultPromise.then((result) => {
            switch (result.kind) {
                case GOOD:
                    this.afterSetupWorkflowCompletes(result.payload)
                    break
                case BAD:
                    //TODO Maybe draw fatal error??
                    console.error(result.error)
                    break
                default:
                    console.error(result)
                    break
            }
        })
    }
    private afterSetupWorkflowCompletes(intializationData: BasicComponentInitialization<DomainType,
        InputType, ViewType, SupportingDataType>) {
        let newContext: BasicComponent<DomainType,
            InputType, ViewType, SupportingDataType> = {
            input: intializationData.input as InputType,
            supportData: intializationData.supportData as SupportingDataType,
            domain: intializationData.domain,
            view: intializationData.view as ViewType,
            msgSender: intializationData.msgSender as ((msg: InputMsg) => void),
            viewDescriptions: intializationData.viewDescriptions as any as ViewDescription<BasicComponent<DomainType,
                InputType, ViewType, SupportingDataType>>,
            currErrors: intializationData.currErrors,
            currMsg: NoEventMsg

        }
        if (intializationData.extraInitializationMap) {
            newContext = intializationData.extraInitializationMap(intializationData, newContext)
        }
        this.currentContext = newContext
        this.renderSteps = buildRenderWorkflowSteps(this.currentContext.viewDescriptions)
        this.doRender()
    }

    private afterWorkflowCompleted(result: ResultForWorkflow<BasicComponent<DomainType,
        InputType, ViewType, SupportingDataType>>) {
        switch (result.kind) {
            case GOOD:
                this.currentContext = {... result.payload, currErrors: []}
                break
            case BAD:
                this.currentContext = {... this.currentContext, currErrors: result.error}
                console.error(result.error)
                break
            default:
                console.error(result)
                break
        }
        this.doRender()
    }
    private doRender() {
        const renderRes = runWorkflow2(this.renderSteps, this.currentContext)
        switch (renderRes.kind) {
            case GOOD:
                break
            case BAD:
                console.error(renderRes.error)
                break
            default:
                console.error(renderRes)
                break
        }
    }
}