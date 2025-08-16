const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

// --- CONFIGURAÇÃO DO E-MAIL ---
const mailTransport = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "administrativo@mercocamp.com",
        pass: "znsk vifz eupq tvis", // IMPORTANTE: Considere usar segredos do Firebase para a senha
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
            
            // Configurações do e-mail
            const mailOptions = {
                from: '"Portal Mercocamp" <administrativo@mercocamp.com>',
                to: email,
                subject: 'Bem-vindo ao Futuro da sua Gestão de Operações!',
                html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 20px; background-color: #111827; }
                        .container { max-width: 600px; margin: 0 auto; background-color: #1F2937; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); overflow: hidden; border: 1px solid #374151;}
                        .header {
                            text-align: center;
                            padding: 60px 20px;
                            background: linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url('https://storage.googleapis.com/logos-portal-mercocamp/C%C3%B3pia%20de%20DSC06217.jpg');
                            background-size: cover;
                            background-position: center;
                        }
                        .header img {
                            max-width: 220px;
                        }
                        .content { padding: 30px 40px; color: #D1D5DB; line-height: 1.7; }
                        .content h2 { color: #ffffff; font-size: 24px; margin-top:0; }
                        .content p { font-size: 16px; }
                        .highlight { background: linear-gradient(to right, #0284c7, #0d9488); -webkit-background-clip: text; color: transparent; font-weight: bold; }
                        .credentials-box { background-color: #374151; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #0d9488; }
                        .credentials-box p { margin: 8px 0; font-size: 16px; color: #ffffff; }
                        .credentials-box b { color: #9CA3AF; }
                        .button-container { text-align: center; margin: 30px 0; }
                        .button { background: linear-gradient(to right, #0284c7, #0d9488); color: #ffffff !important; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; transition: transform 0.2s; }
                        .button:hover { transform: scale(1.05); }
                        .footer { padding: 30px 20px; text-align: center; font-size: 14px; color: #9CA3AF; border-top: 1px solid #374151;}
                        .footer p { margin: 5px 0; }
                        .footer a { color: #D1D5DB; text-decoration: none; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <img src="https://storage.googleapis.com/logos-portal-mercocamp/logo.png" alt="Logo"/>
                        </div>
                        <div class="content">
                            <h2>Olá, ${nome}!</h2>
                            <p>Sua jornada para uma gestão de operações <span class="highlight">inteligente e orientada por dados</span> começa agora.</p>
                            <p>Este não é apenas um dashboard; é o seu novo centro de comando, com análises, visão 360° dos seus clientes e insights gerados por IA para impulsionar suas decisões.</p>
                            <p>Use as credenciais abaixo para seu primeiro acesso:</p>
                            <div class="credentials-box">
                                <p><b>Login:</b> ${email}</p>
                                <p><b>Senha Provisória:</b> ${password}</p>
                            </div>
                            <p><strong>Importante:</strong> Por segurança, recomendamos que você altere sua senha assim que fizer o login através do menu "Meu Perfil".</p>
                            <div class="button-container">
                                <a href="https://dashboard-mercocamp.vercel.app" class="button">Acessar Portal Inteligente</a>
                            </div>
                        </div>
                        <div class="footer">
                            <p>Precisa de ajuda?</p>
                            <p>Para dúvidas, erros ou sugestões, entre em contato:</p>
                            <p style="margin-top: 15px;">
                                <a href="mailto:administrativo@mercocamp.com">administrativo@mercocamp.com</a>
                            </p>
                            <p>
                                <a href="https://wa.me/5527999569048">+55 27 99956-9048 (WhatsApp)</a>
                            </p>
                        </div>
                    </div>
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