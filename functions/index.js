const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

// --- CONFIGURAÇÃO DO E-MAIL ---
const mailTransport = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "administrativo@mercocamp.com",
        pass: "znsk vifz eupq tvis",
    },
});

/**
 * Cria um novo usuário e envia um e-mail com a senha provisória.
 */
exports.createUser = functions
    .region("southamerica-east1")
    .https.onCall(async (data, context) => {
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
            const userRecord = await admin.auth().createUser({
                email: email,
                password: password,
                displayName: nome,
            });

            await admin.auth().setCustomUserClaims(userRecord.uid, { admin: isAdmin });

            await admin.firestore().collection("users").doc(userRecord.uid).set({
                nome: nome,
                email: email,
                isAdmin: isAdmin,
                permissoes: permissoes || {},
            });
            
            const mailOptions = {
                from: '"Portal Mercocamp" <administrativo@mercocamp.com>',
                to: email,
                subject: 'Sua conta no Portal foi criada!',
                html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f7f6; }
                        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 6px 18px rgba(0,0,0,0.06); overflow: hidden; border: 1px solid #e9e9e9;}
                        .header { text-align: center; padding: 40px 20px; background-color: #f8f9fa; border-bottom: 1px solid #e9e9e9; }
                        .header img { max-width: 200px; }
                        .content { padding: 30px 40px; color: #333; line-height: 1.7; }
                        .content h2 { color: #0d9488; font-size: 22px; }
                        .credentials-box { background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0d9488; }
                        .credentials-box p { margin: 5px 0; font-size: 16px; }
                        .button-container { text-align: center; margin: 30px 0; }
                        .button { background-color: #0d9488; color: #ffffff !important; padding: 15px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; }
                        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #777; border-top: 1px solid #e9e9e9;}
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <img src="https://storage.googleapis.com/logos-portal-mercocamp/logo.png" alt="Logo"/>
                        </div>
                        <div class="content">
                            <h2>Olá, ${nome}!</h2>
                            <p>Sua conta para acessar nosso portal de faturamento foi criada com sucesso.</p>
                            <p>Use as credenciais abaixo para seu primeiro acesso:</p>
                            <div class="credentials-box">
                                <p><b>Login:</b> ${email}</p>
                                <p><b>Senha Provisória:</b> ${password}</p>
                            </div>
                            <p><strong>Importante:</strong> Por segurança, recomendamos que você altere sua senha assim que fizer o login. Você encontrará a opção para alterar a senha no menu "Meu Perfil".</p>
                            <div class="button-container">
                                <a href="https://dashboard-mercocamp.vercel.app" class="button">Acessar o Portal</a>
                            </div>
                        </div>
                        <div class="footer">
                            <p>Este é um e-mail automático. Em caso de dúvidas, entre em contato com nosso suporte.</p>
                        </div>
                    </div>
                </body>
                </html>
                `
            };

            await mailTransport.sendMail(mailOptions);

            return { result: `Usuário ${email} criado e e-mail com senha provisória enviado.` };

        } catch (error) {
            console.error("Erro ao criar usuário:", error);
            throw new functions.https.HttpsError("internal", error.message);
        }
    });

// ... (as funções updateUser e deleteUser continuam iguais) ...
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
