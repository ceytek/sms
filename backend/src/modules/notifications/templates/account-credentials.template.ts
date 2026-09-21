export type AccountCredentialContent = {
  companyName: string;
  companyCode: string;
  username: string;
  password: string;
};

export function accountCredentialsSms(content: AccountCredentialContent) {
  return [
    'Toplu SMS hesabınız oluşturuldu.',
    `Firma: ${content.companyName}`,
    `Firma Kodu: ${content.companyCode}`,
    `Kullanıcı Adı: ${content.username}`,
    `Şifre: ${content.password}`,
  ].join('\n');
}

export function accountCredentialsEmail(content: AccountCredentialContent) {
  return {
    subject: `Toplu SMS giriş bilgileriniz — ${content.companyCode}`,
    body: [
      `Merhaba,`,
      ``,
      `${content.companyName} için Toplu SMS hesabınız oluşturuldu.`,
      ``,
      `Firma Kodu: ${content.companyCode}`,
      `Kullanıcı Adı: ${content.username}`,
      `Şifre: ${content.password}`,
      ``,
      `Bu şifreyi kimseyle paylaşmayın. Giriş yaptıktan sonra değiştirmenizi öneririz.`,
    ].join('\n'),
  };
}
