interface Person {
  name: string;
  surname: string;
  birthDate: Date | null;
  birthPlace: string;
  taxCode: CodiceFiscale;
  email?: string | null;
  phone?: string | null;
  citizenship?: string | null;
  signatureFileId?: string | null;
}