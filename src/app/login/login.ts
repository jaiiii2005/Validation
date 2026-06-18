import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  user = {
    name: '',
    password: '',
  };
  onSubmit(form: any) {
    if (form.valid) {
      alert('form Submitted Successfully');
      console.log(this.user);
    }
  }
}
