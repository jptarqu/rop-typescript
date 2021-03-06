export const enum PrimitiveIdentifierConsts {
    SingleLineText  = 'SingleLineText' ,
    Money  = 'Money',
    MultiLineText  = 'MultiLineText',
    FileInput  = 'FileInput',
    Choices = 'Choices' ,
    FutureDate = 'FutureDate',
    PastDate = 'PastDate'
    
}

export type PrimitiveIdentifier = 
    PrimitiveIdentifierConsts.Choices 
    | PrimitiveIdentifierConsts.FileInput 
    | PrimitiveIdentifierConsts.Money 
    | PrimitiveIdentifierConsts.MultiLineText 
    | PrimitiveIdentifierConsts.SingleLineText
    | PrimitiveIdentifierConsts.FutureDate
    | PrimitiveIdentifierConsts.PastDate

export interface UserDefinedFieldDefinition {
    label: string ,
    primitiveType:  PrimitiveIdentifier,
    options: string[]
} 

// const te : UserDefinedFieldDefinition = { label: 'aj', primitiveType : PrimitiveIdentifierConsts.MultiLineText  }