const nodemailer = require('nodemailer');
const Mailgen = require('mailgen');
require('dotenv').config();

const sendVerificationMail = async (targetEmail, fullName, id_account) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASS,
      },
    });

    let mailGenerator = new Mailgen({
      theme: 'default',
      product: {
        name: 'The KreaT Team',
        link: 'https://mailgen.js/',
        logo: 'https://res.cloudinary.com/dzuzcewvj/image/upload/v1687577905/avatars/wcqkxwj8xw2vjfkdrmok.png',
        logoHeight: '200px',
        copyright: 'Copyright © 2023 KreaT. All rights reserved.',
      },
    });

    let mailContent = {
      body: {
        name: fullName,
        intro: "Thanks for signing up for KreaT. We're very excited to have you on board.",
        action: {
          instructions: 'To get started with KreaT, please verify your email below:',
          button: {
            color: '#0093FF',
            text: 'Verify your email',
            link: `http://localhost:3000/auth/verify/${id_account}`,
          },
        },
        signature: 'Sincerely',
        outro: "Need help, or have questions? Just reply to this email, we'd love to help.",
      },
    };

    let mail = await mailGenerator.generate(mailContent);

    await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: targetEmail,
      subject: 'KreaT - Verify your email',
      html: mail,
    });
  } catch (error) {
    console.log('error: ' + error);
  }
};

module.exports = sendVerificationMail;
