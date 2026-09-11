const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'resources/js/pages/admin/settings/index.tsx');
let content = fs.readFileSync(file, 'utf8');

const insertionPoint = `<div className="flex items-center gap-3 border-t pt-4">`;
const footerSection = `
                        {/* Footer Settings */}
                        <div className="border-t pt-6 mt-6">
                            <h3 className="mb-4 text-lg font-semibold">Footer Settings</h3>
                            
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="about_text">About Text</Label>
                                    <textarea
                                        id="about_text"
                                        className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        value={footer.about_text || ''}
                                        onChange={(e) => handleFooterChange('about_text', e.target.value)}
                                        rows={3}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="contact_email">Contact Email</Label>
                                    <Input
                                        id="contact_email"
                                        value={footer.contact_email || ''}
                                        onChange={(e) => handleFooterChange('contact_email', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="copyright_text">Copyright Text</Label>
                                    <Input
                                        id="copyright_text"
                                        value={footer.copyright_text || ''}
                                        onChange={(e) => handleFooterChange('copyright_text', e.target.value)}
                                    />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="social_facebook">Facebook URL</Label>
                                        <Input
                                            id="social_facebook"
                                            value={footer.social_facebook || ''}
                                            onChange={(e) => handleFooterChange('social_facebook', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="social_twitter">Twitter URL</Label>
                                        <Input
                                            id="social_twitter"
                                            value={footer.social_twitter || ''}
                                            onChange={(e) => handleFooterChange('social_twitter', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="social_discord">Discord URL</Label>
                                        <Input
                                            id="social_discord"
                                            value={footer.social_discord || ''}
                                            onChange={(e) => handleFooterChange('social_discord', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="social_youtube">YouTube URL</Label>
                                        <Input
                                            id="social_youtube"
                                            value={footer.social_youtube || ''}
                                            onChange={(e) => handleFooterChange('social_youtube', e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="link_terms">Terms URL</Label>
                                        <Input
                                            id="link_terms"
                                            value={footer.link_terms || ''}
                                            onChange={(e) => handleFooterChange('link_terms', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="link_privacy">Privacy URL</Label>
                                        <Input
                                            id="link_privacy"
                                            value={footer.link_privacy || ''}
                                            onChange={(e) => handleFooterChange('link_privacy', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="link_faq">FAQ URL</Label>
                                        <Input
                                            id="link_faq"
                                            value={footer.link_faq || ''}
                                            onChange={(e) => handleFooterChange('link_faq', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        `;

if (!content.includes('Footer Settings')) {
    content = content.replace(insertionPoint, footerSection + insertionPoint);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Added footer section');
} else {
    console.log('Footer section already exists');
}
