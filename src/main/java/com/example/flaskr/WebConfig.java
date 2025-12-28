package com.example.flaskr;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;

/**
 * Spring MVC設定クラス
 * SPAのクライアントサイドルーティングをサポートするため、
 * index.htmlへのフォールバック機能を提供
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/**")
                .addResourceLocations("classpath:/static/")
                .resourceChain(true)
                .addResolver(new SpaFallbackResourceResolver());
    }

    /**
     * SPAフォールバック用のカスタムResourceResolver
     *
     * 以下のルールでリソース解決を行う:
     * 1. API・H2コンソール・Actuatorのパスは除外（フォールバックせず404を返す）
     * 2. 拡張子付きパスは静的ファイルとして扱い、存在しなければ404
     * 3. 上記以外はクライアントルーティングとみなし、index.htmlにフォールバック
     */
    private static class SpaFallbackResourceResolver extends PathResourceResolver {

        // 除外するパスプレフィックス（@RequestMappingのパス、H2コンソール、Actuator）
        // 注: resourcePathは先頭のスラッシュなしで渡されるため、スラッシュなしで定義
        private static final List<String> EXCLUDED_PATHS = Arrays.asList(
            "api/",
            "h2-console/",
            "actuator/"
        );

        @Override
        protected Resource getResource(String resourcePath, Resource location) throws IOException {
            // 1. 除外パスチェック（@RequestMapping、H2、Actuator）
            for (String excludedPath : EXCLUDED_PATHS) {
                if (resourcePath.startsWith(excludedPath)) {
                    return null; // 404
                }
            }

            // 2. 拡張子チェック
            if (hasExtension(resourcePath)) {
                // 拡張子がある場合は実際のファイルのみ返す
                Resource requestedResource = location.createRelative(resourcePath);
                return (requestedResource.exists() && requestedResource.isReadable())
                        ? requestedResource
                        : null; // 404
            }

            // 3. 実際のリソースを探す
            Resource requestedResource = location.createRelative(resourcePath);
            if (requestedResource.exists() && requestedResource.isReadable()) {
                return requestedResource;
            }

            // 4. クライアントルーティング → index.htmlにフォールバック
            return location.createRelative("index.html");
        }

        /**
         * パスに拡張子が含まれているかチェック
         *
         * @param path チェックするパス
         * @return 拡張子がある場合true
         */
        private boolean hasExtension(String path) {
            int lastSlash = path.lastIndexOf('/');
            int lastDot = path.lastIndexOf('.');
            // 最後のスラッシュより後にドットがあれば拡張子あり
            return lastDot > lastSlash && lastDot != -1;
        }
    }
}
