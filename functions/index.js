const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

// --- CONFIGURAÇÃO DO E-MAIL ---
// É altamente recomendável usar os segredos do Firebase para armazenar credenciais.
// https://firebase.google.com/docs/functions/config-env
const mailTransport = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "administrativo@mercocamp.com",
        pass: "znsk vifz eupq tvis", // IMPORTANTE: Mova para secrets do Firebase
    },
});

/**
 * Cria um novo usuário e envia um e-mail com a senha provisória.
 */
exports.createUser = functions
    .region("southamerica-east1")
    .https.onCall(async (data, context) => {
        // Verifica se o usuário que está chamando a função é um administrador
        if (!context.auth || context.auth.token.admin !== true) {
            throw new functions.https.HttpsError(
                "permission-denied",
                "Apenas administradores podem criar novos usuários."
            );
        }

        const { email, password, nome, isAdmin, permissoes } = data;

        if (!password || password.length < 6) {
            throw new functions.https.HttpsError(
                "invalid-argument",
                "A senha deve ter pelo menos 6 caracteres."
            );
        }

        try {
            // Cria o usuário no Firebase Authentication
            const userRecord = await admin.auth().createUser({
                email: email,
                password: password,
                displayName: nome,
            });

            // Define as permissões customizadas (admin)
            await admin.auth().setCustomUserClaims(userRecord.uid, { admin: isAdmin });

            // Salva os dados do usuário no Firestore
            await admin.firestore().collection("users").doc(userRecord.uid).set({
                nome: nome,
                email: email,
                isAdmin: isAdmin,
                permissoes: permissoes || {},
            });
            
            // --- NOVO TEMPLATE DE E-MAIL ---
            // Define a paleta de cores da marca e extrai o primeiro nome
            const brand = { primary:"#0988AD", primaryDark:"#184060", primaryLight:"#4787B2" };
            const primeiroNome = (nome || "").trim().split(" ")[0] || "bem-vindo";
            
            // Configurações do e-mail com o template profissional
            const mailOptions = {
              from: '"Portal Mercocamp" <administrativo@mercocamp.com>',
              to: email,
              subject: 'Bem-vindo ao Portal Mercocamp!',
              text:`Olá, ${primeiroNome}!\n\nSeu acesso está pronto.\n\nLogin: ${email}\nSenha provisória: ${password}\n\nAltere sua senha em "Meu Perfil" após o primeiro login.\nPortal: https://dashboard-mercocamp.vercel.app\n\nSuporte: administrativo@mercocamp.com | +55 27 99956-9048`,
              html: `
              <!doctype html>
              <html lang="pt-BR">
                <head>
                  <meta http-equiv="x-ua-compatible" content="ie=edge">
                  <meta name="viewport" content="width=device-width">
                  <meta name="x-apple-disable-message-reformatting">
                  <title>Bem-vindo</title>
                  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
                    Seu acesso ao Portal Mercocamp está pronto. Use as credenciais e altere a senha no primeiro login.
                  </div>
                </head>
                <body style="margin:0;padding:0;background:#f3f4f6;">
                  <center style="width:100%;background:#f3f4f6;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:640px;margin:0 auto;">
                      <!-- Imagem Hero -->
                      <tr>
                        <td style="padding:0;">
                          <img src="https://storage.googleapis.com/logos-portal-mercocamp/C%C3%B3pia%20de%20DSC06217.jpg"
                               alt="Centro de Distribuição Mercocamp" width="640"
                               style="width:100%;max-width:640px;height:auto;display:block;border:0;border-radius:14px 14px 0 0;">
                        </td>
                      </tr>
              
                      <!-- Card Principal com Logo Sobreposto -->
                      <tr>
                        <td style="padding:0 12px;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" 
                                 style="background:#ffffff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 14px 14px;box-shadow:0 4px 14px rgba(0,0,0,.06);margin-top:-50px;">
                            <tr>
                              <td style="padding:0 24px;">
                                <!-- Logo -->
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="text-align:center;margin-bottom:16px;">
                                  <tr>
                                    <td style="padding-top:16px;">
                                      <img src="https://storage.googleapis.com/logos-portal-mercocamp/logo.png"
                                           alt="Mercocamp" width="170" style="display:inline-block;height:auto;border:0;background:rgba(255,255,255,0.9);padding:10px 20px;border-radius:12px;box-shadow:0 4px 10px rgba(0,0,0,0.1);">
                                    </td>
                                  </tr>
                                </table>
              
                                <!-- Título + faixa -->
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
                                  <tr>
                                    <td>
                                      <h1 style="margin:0 0 8px 0;font-size:22px;line-height:1.35;font-weight:700;">Olá, ${primeiroNome}!</h1>
                                      <div style="height:4px;width:84px;background:${brand.primary};border-radius:999px;"></div>
                                    </td>
                                  </tr>
                                </table>
              
                                <!-- Texto -->
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:14px 0 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#374151;">
                                  <tr>
                                    <td style="font-size:15px;line-height:1.65;">
                                      <p style="margin:0 0 12px 0;">Sua jornada para uma gestão de operações <strong>inteligente e orientada por dados</strong> começa agora.</p>
                                      <p style="margin:0 0 16px 0;">O Portal Mercocamp é o seu centro de comando: análises claras, visão 360° dos clientes e insights com IA.</p>
                                      <p style="margin:0 0 8px 0;">Use as credenciais abaixo para o primeiro acesso:</p>
                                    </td>
                                  </tr>
                                </table>
              
                                <!-- Credenciais -->
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                  <tr>
                                    <td style="background:#f9fafb;border:1px solid #e5e7eb;border-left:4px solid ${brand.primary};border-radius:10px;padding:14px 16px;">
                                      <p style="margin:0 0 6px 0;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.35px;">Credenciais</p>
                                      <p style="margin:0 0 6px 0;font-size:15px;color:#1f2937;"><strong>Login:</strong> ${email}</p>
                                      <p style="margin:0;font-size:15px;color:#1f2937;">
                                        <strong>Senha provisória:</strong>
                                        <span style="font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,'Courier New',monospace;background:#eef7fb;border:1px solid #d7ebf3;color:${brand.primaryDark};padding:2px 8px;border-radius:6px;display:inline-block;">${password}</span>
                                      </p>
                                    </td>
                                  </tr>
                                </table>
              
                                <!-- Aviso -->
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:10px 0 0 0;">
                                  <tr>
                                    <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:#6b7280;">
                                      <p style="margin:0 0 16px 0;"><strong>Importante:</strong> altere sua senha em <em>Meu Perfil</em> logo após o primeiro login.</p>
                                    </td>
                                  </tr>
                                </table>
              
                                <!-- Botão -->
                                <table role="presentation" align="center" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto 6px auto;">
                                  <tr>
                                    <td bgcolor="${brand.primary}" style="border-radius:10px;">
                                      <a href="https://dashboard-mercocamp.vercel.app"
                                         style="display:inline-block;padding:14px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">Acessar Portal</a>
                                    </td>
                                  </tr>
                                </table>
              
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:6px 0 22px 0;">
                                  <tr>
                                    <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#374151;font-size:14px;line-height:1.6;">
                                      <ul style="margin:10px 0 0 18px;padding:0;">
                                        <li>Indicadores por competência</li>
                                        <li>Top clientes, inadimplência e Pareto</li>
                                        <li>Insights com suporte de IA</li>
                                      </ul>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
              
                      <!-- Rodapé -->
                      <tr>
                        <td style="text-align:center;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#6b7280;">
                          <!-- Ícones Sociais -->
                          <table role="presentation" align="center" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto 16px auto;">
                            <tr>
                              <td style="padding:0 8px;">
                                <a href="https://www.facebook.com/grupomercocamp" target="_blank">
                                  <img src="https://storage.googleapis.com/logos-portal-mercocamp/icon-facebook.png" alt="Facebook" width="24" style="display:block;border:0;">
                                </a>
                              </td>
                              <td style="padding:0 8px;">
                                <a href="https://www.instagram.com/mercocamp" target="_blank">
                                  <img src="https://storage.googleapis.com/logos-portal-mercocamp/icon-instagram.png" alt="Instagram" width="24" style="display:block;border:0;">
                                </a>
                              </td>
                              <td style="padding:0 8px;">
                                <a href="https://www.linkedin.com/company/grupomercocamp" target="_blank">
                                  <img src="https://storage.googleapis.com/logos-portal-mercocamp/icon-linkedin.png" alt="LinkedIn" width="24" style="display:block;border:0;">
                                </a>
                              </td>
                            </tr>
                          </table>
                          <p style="margin:0 0 6px 0;font-size:13px;">Dúvidas? Fale com a gente:</p>
                          <p style="margin:0 0 10px 0;font-size:14px;">
                            <a href="mailto:administrativo@mercocamp.com" style="color:${brand.primaryLight};text-decoration:none;font-weight:600;">administrativo@mercocamp.com</a>
                            &nbsp;|&nbsp;
                            <a href="https://wa.me/5527999569048" style="color:${brand.primaryLight};text-decoration:none;font-weight:600;">+55 27 99956-9048</a>
                          </p>
                          <p style="margin:0;font-size:12px;color:#9ca3af;">© ${new Date().getFullYear()} Mercocamp. Todos os direitos reservados.</p>
                        </td>
                      </tr>
                    </table>
                  </center>
                </body>
              </html>
              `
            };

            // Envia o e-mail
            await mailTransport.sendMail(mailOptions);

            return { result: `Usuário ${email} criado e e-mail com senha provisória enviado.` };

        } catch (error) {
            console.error("Erro ao criar usuário:", error);
            throw new functions.https.HttpsError("internal", error.message);
        }
    });

// --- FUNÇÕES DE ATUALIZAR E DELETAR USUÁRIO ---
// (O restante do seu código permanece o mesmo)

exports.updateUser = functions
    .region("southamerica-east1")
    .https.onCall(async (data, context) => {
        if (!context.auth || context.auth.token.admin !== true) {
            throw new functions.https.HttpsError(
                "permission-denied",
                "Apenas administradores podem atualizar usuários."
            );
        }
        const { uid, nome, isAdmin, permissoes } = data;
        try {
            await admin.auth().setCustomUserClaims(uid, { admin: isAdmin });
            await admin.firestore().collection("users").doc(uid).update({
                nome: nome,
                isAdmin: isAdmin,
                permissoes: permissoes || {},
            });
            return { result: `Usuário ${uid} atualizado com sucesso.` };
        } catch (error) {
            console.error("Erro ao atualizar usuário:", error);
            throw new functions.https.HttpsError("internal", error.message);
        }
    });

exports.deleteUser = functions
    .region("southamerica-east1")
    .https.onCall(async (data, context) => {
        if (!context.auth || context.auth.token.admin !== true) {
            throw new functions.https.HttpsError(
                "permission-denied",
                "Apenas administradores podem deletar usuários."
            );
        }
        const { uid } = data;
        try {
            await admin.auth().deleteUser(uid);
            await admin.firestore().collection("users").doc(uid).delete();
            return { result: `Usuário ${uid} deletado com sucesso.` };
        } catch (error) {
            console.error("Erro ao deletar usuário:", error);
            throw new functions.https.HttpsError("internal", error.message);
        }
    });
