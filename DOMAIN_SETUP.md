# Custom Domain Setup for rollexmodellingagency.me

This project uses **Firebase Hosting** for deployment. To configure the custom domain `rollexmodellingagency.me`, follow these steps:

## Prerequisites
- Access to the Firebase Console for the `rolex-modelling` project
- Access to your domain registrar's DNS settings (for rollexmodellingagency.me)

## Step 1: Add Custom Domain in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select the `rolex-modelling` project
3. Navigate to **Hosting** in the left sidebar
4. Click on **Add custom domain**
5. Enter your domain: `rollexmodellingagency.me`
6. Follow the verification steps provided by Firebase

## Step 2: Configure DNS Records

Firebase will provide you with DNS records that need to be added to your domain registrar. Typically, you'll need to add:

### For apex domain (rollexmodellingagency.me):
- **A Record**: Point to Firebase's IP addresses (provided in the console)

OR

- **CNAME Record** (if your registrar supports CNAME flattening): Point to your Firebase hosting subdomain

### For www subdomain (www.rollexmodellingagency.me):
- **CNAME Record**: Point to your Firebase hosting subdomain (e.g., `rolex-modelling.web.app`)

## Step 3: Verify Domain Ownership

Firebase will verify your domain ownership through the DNS records. This may take a few minutes to propagate.

## Step 4: SSL Certificate

Firebase automatically provisions an SSL certificate for your custom domain once DNS verification is complete. This can take up to 24 hours.

## Common Issues

### "Domain's DNS record could not be retrieved (InvalidDNSError)"
This error occurs when:
- DNS records are not yet propagated (can take up to 48 hours)
- DNS records are incorrectly configured
- Domain verification is incomplete

**Solution**: 
1. Verify DNS records are correctly configured in your domain registrar
2. Wait for DNS propagation (use tools like `dig` or `nslookup` to check)
3. Ensure domain verification in Firebase Console is complete

## Important Notes

- **DO NOT** use a CNAME file in the repository root - this is for GitHub Pages only
- Custom domains for Firebase Hosting are managed entirely through the Firebase Console
- The domain configuration is separate from the code repository

## Helpful Resources

- [Firebase Custom Domain Documentation](https://firebase.google.com/docs/hosting/custom-domain)
- [DNS Propagation Checker](https://www.whatsmydns.net/)
