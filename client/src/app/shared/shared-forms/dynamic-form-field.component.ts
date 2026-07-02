import { Component, input, ChangeDetectionStrategy } from '@angular/core'
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms'
import { RegisterClientFormFieldOptions } from '@boomboom/boomboom-models'
import { HelpComponent } from '../shared-main/buttons/help.component'
import { InputTextComponent } from './input-text.component'
import { MarkdownTextareaComponent } from './markdown-textarea.component'
import { BoomboomCheckboxComponent } from './boomboom-checkbox.component'

@Component({
  selector: 'my-dynamic-form-field',
  templateUrl: './dynamic-form-field.component.html',
  styleUrls: [ './dynamic-form-field.component.scss' ],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    BoomboomCheckboxComponent,
    InputTextComponent,
    HelpComponent,
    MarkdownTextareaComponent
  ]
})
export class DynamicFormFieldComponent {
  readonly form = input<FormGroup>(undefined)
  readonly formErrors = input<any>(undefined)
  readonly setting = input<RegisterClientFormFieldOptions>(undefined)

  hasDedicatedFormError () {
    const dedicated = new Set<RegisterClientFormFieldOptions['type']>([
      'input-checkbox',
      'input',
      'select',
      'input-textarea'
    ])

    return dedicated.has(this.setting().type)
  }
}
