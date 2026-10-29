import { useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { STAGES } from '../../shared/data/seagrass-stories';
import { submitNewMaterial } from '../../team/data/governanceService';
import { Button } from '../../shared/ui/Button';
import styles from './ShareMaterialPage.module.css';

const MATERIAL_TYPES = ['Activity', 'Slides', 'Student work', 'Reading', 'Other'] as const;
const AUDIENCES = ['Schools', 'University'] as const;

type MaterialType = typeof MATERIAL_TYPES[number];
type Audience = typeof AUDIENCES[number];
type Stage = typeof STAGES[number];

interface FormData {
  title: string;
  materialType: MaterialType | '';
  link: string;
  stage: Stage | '';
  audience: Audience | '';
  description: string;
  creditName: string;
  creditInstitution: string;
  email: string;
  okToReuse: boolean;
}

interface Errors {
  title?: string;
  materialType?: string;
  link?: string;
  stage?: string;
  audience?: string;
  description?: string;
  creditName?: string;
  creditInstitution?: string;
  email?: string;
  okToReuse?: string;
}

const initialFormData: FormData = {
  title: '',
  materialType: '',
  link: '',
  stage: '',
  audience: '',
  description: '',
  creditName: '',
  creditInstitution: '',
  email: '',
  okToReuse: false,
};

const initialErrors: Errors = {};

function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function ShareMaterialPage() {
  const [searchParams] = useSearchParams();
  const pkgSlug = searchParams.get('pkg') || undefined;

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Errors>(initialErrors);
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [sending, setSending] = useState(false);
  const h1Ref = useRef<HTMLHeadingElement>(null);

  const scrollToTopAndFocus = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    setTimeout(() => h1Ref.current?.focus({ preventScroll: true }), 0);
  };

  const handleChange = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof Errors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Errors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length > 80) {
      newErrors.title = 'Title must be 80 characters or fewer';
    }

    if (!formData.materialType) {
      newErrors.materialType = 'Select a material type';
    }

    if (!formData.link.trim()) {
      newErrors.link = 'Link is required';
    } else if (!isValidUrl(formData.link)) {
      newErrors.link = 'Link must start with https://';
    }

    if (!formData.stage) {
      newErrors.stage = 'Select a story stage';
    }

    if (!formData.audience) {
      newErrors.audience = 'Select an audience';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length > 600) {
      newErrors.description = 'Description must be 600 characters or fewer';
    }

    if (!formData.creditName.trim()) {
      newErrors.creditName = 'Your name is required';
    }

    if (!formData.creditInstitution.trim()) {
      newErrors.creditInstitution = 'Institution is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Enter a valid email address';
    }

    if (!formData.okToReuse) {
      newErrors.okToReuse = 'You must agree to share this in the library with credit to you';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      scrollToTopAndFocus();
      return;
    }

    setSending(true);
    setErrors(initialErrors);

    try {
      await submitNewMaterial({
        title: formData.title.trim(),
        materialType: formData.materialType,
        materialLink: formData.link.trim(),
        stage: formData.stage,
        audience: formData.audience,
        description: formData.description.trim(),
        creditName: formData.creditName.trim(),
        creditInstitution: formData.creditInstitution.trim(),
        educatorEmail: formData.email.trim(),
        okToReuse: formData.okToReuse,
        pkgSlug,
      });
      setStep('success');
      scrollToTopAndFocus();
    } catch {
      setErrors({ title: 'Something went wrong. Please try again.' });
      scrollToTopAndFocus();
    } finally {
      setSending(false);
    }
  };

  const renderForm = () => (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <div className={styles.fieldGroup}>
        <label htmlFor="title" className={styles.fieldLabel}>
          Title <span className={styles.required}>*</span>
        </label>
        <input
          id="title"
          type="text"
          className={`${styles.input} ${errors.title ? styles.inputError : ''}`}
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          maxLength={80}
          placeholder="e.g. Seagrass carbon cycle card sort"
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? 'title-error' : undefined}
          disabled={sending}
        />
        {errors.title && <p id="title-error" className={styles.errorText} role="alert">{errors.title}</p>}
        <p className={styles.charCounter}>{formData.title.length}/80</p>
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>
          Type <span className={styles.required}>*</span>
        </label>
        <div className={styles.segmentedGroup} role="group" aria-label="Material type">
          {MATERIAL_TYPES.map((type) => (
            <label key={type} className={`${styles.segmentedBtn} ${formData.materialType === type ? styles.segmentedBtnActive : ''} ${errors.materialType ? styles.segmentedBtnError : ''}`}>
              <input
                type="radio"
                name="materialType"
                value={type}
                checked={formData.materialType === type}
                onChange={() => handleChange('materialType', type)}
                className={styles.segmentedInput}
                disabled={sending}
              />
              <span className={styles.segmentedText}>{type}</span>
            </label>
          ))}
        </div>
        {errors.materialType && <p className={styles.errorText} role="alert">{errors.materialType}</p>}
      </div>

      <div className={styles.fieldGroup}>
        <label htmlFor="link" className={styles.fieldLabel}>
          Link to your material <span className={styles.required}>*</span>
        </label>
        <input
          id="link"
          type="url"
          className={`${styles.input} ${errors.link ? styles.inputError : ''}`}
          value={formData.link}
          onChange={(e) => handleChange('link', e.target.value)}
          placeholder="https://..."
          aria-invalid={!!errors.link}
          aria-describedby={errors.link ? 'link-error' : 'link-hint'}
          disabled={sending}
        />
        {errors.link && <p id="link-error" className={styles.errorText} role="alert">{errors.link}</p>}
        <p id="link-hint" className={styles.hint}>Google Drive, OneDrive, Canva or Padlet. Set sharing to "Anyone with the link".</p>
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>
          Story stage <span className={styles.required}>*</span>
        </label>
        <div className={styles.segmentedGroup} role="group" aria-label="Story stage">
          {STAGES.map((stage) => (
            <label key={stage} className={`${styles.segmentedBtn} ${formData.stage === stage ? styles.segmentedBtnActive : ''} ${errors.stage ? styles.segmentedBtnError : ''}`}>
              <input
                type="radio"
                name="stage"
                value={stage}
                checked={formData.stage === stage}
                onChange={() => handleChange('stage', stage)}
                className={styles.segmentedInput}
                disabled={sending}
              />
              <span className={styles.segmentedText}>{stage}</span>
            </label>
          ))}
        </div>
        {errors.stage && <p className={styles.errorText} role="alert">{errors.stage}</p>}
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>
          Audience <span className={styles.required}>*</span>
        </label>
        <div className={styles.segmentedGroup} role="group" aria-label="Audience">
          {AUDIENCES.map((audience) => (
            <label key={audience} className={`${styles.segmentedBtn} ${formData.audience === audience ? styles.segmentedBtnActive : ''} ${errors.audience ? styles.segmentedBtnError : ''}`}>
              <input
                type="radio"
                name="audience"
                value={audience}
                checked={formData.audience === audience}
                onChange={() => handleChange('audience', audience)}
                className={styles.segmentedInput}
                disabled={sending}
              />
              <span className={styles.segmentedText}>{audience}</span>
            </label>
          ))}
        </div>
        {errors.audience && <p className={styles.errorText} role="alert">{errors.audience}</p>}
      </div>

      <div className={styles.fieldGroup}>
        <label htmlFor="description" className={styles.fieldLabel}>
          What did learners do with it? <span className={styles.required}>*</span>
        </label>
        <textarea
          id="description"
          className={`${styles.textarea} ${errors.description ? styles.inputError : ''}`}
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          maxLength={600}
          rows={4}
          placeholder="Describe how you used this material in your session and what learners did with it."
          aria-invalid={!!errors.description}
          aria-describedby={errors.description ? 'description-error' : undefined}
          disabled={sending}
        />
        {errors.description && <p id="description-error" className={styles.errorText} role="alert">{errors.description}</p>}
        <p className={styles.charCounter}>{formData.description.length}/600</p>
      </div>

      <div className={styles.twoColumn}>
        <div className={styles.fieldGroup}>
          <label htmlFor="creditName" className={styles.fieldLabel}>
            Your name <span className={styles.required}>*</span>
          </label>
          <input
            id="creditName"
            type="text"
            className={`${styles.input} ${errors.creditName ? styles.inputError : ''}`}
            value={formData.creditName}
            onChange={(e) => handleChange('creditName', e.target.value)}
            placeholder="e.g. Dr. Jane Smith"
            aria-invalid={!!errors.creditName}
            aria-describedby={errors.creditName ? 'creditName-error' : undefined}
            disabled={sending}
          />
          {errors.creditName && <p id="creditName-error" className={styles.errorText} role="alert">{errors.creditName}</p>}
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor="creditInstitution" className={styles.fieldLabel}>
            Institution <span className={styles.required}>*</span>
          </label>
          <input
            id="creditInstitution"
            type="text"
            className={`${styles.input} ${errors.creditInstitution ? styles.inputError : ''}`}
            value={formData.creditInstitution}
            onChange={(e) => handleChange('creditInstitution', e.target.value)}
            placeholder="e.g. University of Marine Science"
            aria-invalid={!!errors.creditInstitution}
            aria-describedby={errors.creditInstitution ? 'creditInstitution-error' : undefined}
            disabled={sending}
          />
          {errors.creditInstitution && <p id="creditInstitution-error" className={styles.errorText} role="alert">{errors.creditInstitution}</p>}
        </div>
      </div>

      <div className={styles.fieldGroup}>
        <label htmlFor="email" className={styles.fieldLabel}>
          Your email <span className={styles.required}>*</span>
        </label>
        <input
          id="email"
          type="email"
          className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          placeholder="professor@university.edu"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
          disabled={sending}
          autoComplete="email"
        />
        {errors.email && <p id="email-error" className={styles.errorText} role="alert">{errors.email}</p>}
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            className={styles.checkboxInput}
            checked={formData.okToReuse}
            onChange={(e) => handleChange('okToReuse', e.target.checked)}
            disabled={sending}
            aria-invalid={!!errors.okToReuse}
            aria-describedby={errors.okToReuse ? 'okToReuse-error' : undefined}
          />
          <span className={styles.checkboxText}>OK for OceanX to share this in the library with credit to me</span>
        </label>
        {errors.okToReuse && <p id="okToReuse-error" className={styles.errorText} role="alert">{errors.okToReuse}</p>}
      </div>

      <div className={styles.actions}>
        <Button type="submit" variant="dark" disabled={sending} className={styles.submitBtn}>
          {sending ? 'Sending...' : 'Send to OceanX'}
        </Button>
      </div>
    </form>
  );

  const renderSuccess = () => (
    <div className={styles.success} role="status" aria-live="polite">
      <h1 className={styles.successTitle} ref={h1Ref} tabIndex={-1}>Thanks, we've got it.</h1>
      <p className={styles.successDesc}>The OceanX team checks every shared material. You'll hear back at {formData.email} within 5 business days.</p>
    </div>
  );

  return (
    <article className={styles.page}>
      <div className={styles.container}>
        {step === 'form' && (
          <>
            <h1 className={styles.h1} ref={h1Ref} tabIndex={-1}>Share your material with OceanX</h1>
            <p className={styles.intro}>Made something for your session? Share it and it may be added to the Seagrass Stories library with your name on it.</p>
            {renderForm()}
          </>
        )}
        {step === 'success' && renderSuccess()}
      </div>
    </article>
  );
}