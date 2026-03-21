import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly loginForm = this.fb.group({
    username: this.fb.nonNullable.control('', [Validators.required]),
    password: this.fb.nonNullable.control('', [Validators.required]),
  });

  errorMessage = '';

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { username, password } = this.loginForm.getRawValue();
    this.authService.login({ username, password }).subscribe({
      next: () => this.router.navigate(['/']),
      error: () => {
        this.errorMessage = 'Nieprawidłowy login lub hasło';
      },
    });
  }
}
