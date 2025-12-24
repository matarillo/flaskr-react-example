package com.example.flaskr;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class FlaskrController {

    @GetMapping("{path:^(?!api).*$}[^\\.]*")
    public String redirect() {
        return "forward:/index.html";
    }
}
